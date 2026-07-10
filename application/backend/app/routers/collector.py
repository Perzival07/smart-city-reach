from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import json
from ..websocket import manager
from .. import crud, schemas, auth, database, models
from datetime import datetime

router = APIRouter(prefix="/collector", tags=["collector"])

@router.get("/tasks", response_model=schemas.PaginatedReports)
def get_collector_tasks(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(database.get_db),
    current_user: schemas.UserOut = Depends(auth.get_current_user)
):
    if current_user.role != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can access tasks")
    skip = (page - 1) * limit
    reports, total = crud.get_reports(
        db,
        assigned_worker_id=current_user.id,
        status=status,
        search=search,
        skip=skip,
        limit=limit
    )
    total_pages = (total + limit - 1) // limit
    return schemas.PaginatedReports(
        items=reports,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@router.patch("/tasks/{task_id}", response_model=schemas.ReportOut)
async def update_task_status(
    task_id: int,
    update: schemas.TaskUpdate,
    db: Session = Depends(database.get_db),
    current_user: schemas.UserOut = Depends(auth.get_current_user)
):
    if current_user.role != "collector":
        raise HTTPException(status_code=403, detail="Only collectors can update tasks")

    report = crud.get_report(db, task_id)
    if not report:
        raise HTTPException(status_code=404, detail="Task not found")
    if report.assigned_worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not assigned to this task")

    # Allowed status transitions
    allowed_statuses = {"in_progress", "resolved", "cancelled"}
    if update.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status transition")

    completed_at = None
    # Auto-set completed_at if resolved
    if update.status == "resolved":
        completed_at = datetime.utcnow()
        crud.update_worker_stats(db, current_user.id)

    # Update the report
    report_update = schemas.ReportUpdate(status=update.status, completed_at=completed_at)
    updated = crud.update_report(db, task_id, report_update)
    
    await manager.broadcast(json.dumps({
        "event": "report:status_changed",
        "id": updated.id,
        "status": updated.status,
        "address": updated.address
    }))
    
    return updated