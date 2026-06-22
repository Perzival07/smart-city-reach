import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Play, Check, XCircle, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { FormField } from "@/components/portal/FormField";
import { Table, Th, Td } from "@/components/portal/Table";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { Button } from "@/components/portal/Button";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { classNames, formatDate } from "@/utils/helpers";

export const Route = createFileRoute("/collector/tasks")({
  component: TaskList,
});

const STATUSES = ["all", "assigned", "in_progress", "resolved"];
const PAGE_SIZE = 10;

function TaskList() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [updating, setUpdating] = useState<string | number | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page + 1));
    p.set("limit", String(PAGE_SIZE));
    if (status !== "all") p.set("status", status);
    if (search.trim()) p.set("search", search.trim());
    return p.toString();
  }, [status, search, page]);

  const { data, loading, error, refetch } = useApi<any>(`/collector/tasks?${qs}`, {}, [qs]);
  const items: any[] = Array.isArray(data) ? data : data?.items ?? [];
  const total: number = data?.total ?? items.length;

  const update = async (id: string | number, next: string) => {
    setUpdating(id);
    try {
      await apiFetch(`/collector/tasks/${id}`, { method: "PATCH", body: { status: next } });
      await refetch();
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <PageHeader title="Tasks" subtitle="Everything assigned to you." />

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <FormField
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search address or category"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(0); }}
              className={classNames(
                "px-3 py-1.5 rounded-full text-xs font-medium border capitalize",
                status === s
                  ? "bg-forest-700 text-sand-50 border-forest-700"
                  : "bg-card text-muted-foreground border-border hover:bg-sand-100"
              )}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load tasks" body={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="w-5 h-5" />}
          title="No tasks match"
          body="Try clearing filters or check back soon."
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Category</Th>
                <Th>Priority</Th>
                <Th>Address</Th>
                <Th>Assigned</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const st = (t.status || "").toLowerCase();
                return (
                  <tr key={t.id} className="hover:bg-sand-50">
                    <Td className="font-mono text-xs">#{String(t.id).slice(0, 6)}</Td>
                    <Td>{t.category || t.tags?.[0] || "—"}</Td>
                    <Td><StatusBadge status={t.priority || "medium"} /></Td>
                    <Td className="max-w-[260px] truncate">{t.address || t.block || "—"}</Td>
                    <Td className="text-muted-foreground">{formatDate(t.assigned_at || t.created_at)}</Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td>
                      <div className="flex justify-end gap-1.5">
                        {st === "assigned" ? (
                          <Button size="sm" loading={updating === t.id} onClick={() => update(t.id, "in_progress")}>
                            <Play className="w-3.5 h-3.5" /> Start
                          </Button>
                        ) : null}
                        {st === "in_progress" ? (
                          <>
                            <Button size="sm" loading={updating === t.id} onClick={() => update(t.id, "resolved")}>
                              <Check className="w-3.5 h-3.5" /> Complete
                            </Button>
                            <Button size="sm" variant="ghost" loading={updating === t.id} onClick={() => update(t.id, "cancelled")}>
                              <XCircle className="w-3.5 h-3.5" /> Cancel
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + items.length} of {total}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={items.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
