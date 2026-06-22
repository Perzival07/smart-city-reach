"""
Seed demo users for local CleanCity development.

Creates one account per role (citizen, collector, admin) so the frontend
can sign in immediately against a fresh database.

Usage
-----
    # from your FastAPI project root, with the app's virtualenv active:
    python -m backend.seed_demo_users
    # or
    python backend/seed_demo_users.py

Environment
-----------
    DATABASE_URL   SQLAlchemy URL (defaults to sqlite:///./cleancity.db)
    SEED_PASSWORD  Override the default password ("Password123!")

Assumptions
-----------
- A SQLAlchemy `User` model exists at `app.models.user.User` with at least:
    id, email, hashed_password, display_name, phone_number,
    role (str/enum: citizen|collector|admin), zone (nullable), is_active.
- A password hasher exposed as `app.core.security.hash_password`.
- A session factory `SessionLocal` exposed at `app.db.session.SessionLocal`.

If your project lays things out differently, tweak the three imports in
`_load_app_bindings()` below — the rest of the script is generic.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Callable, Iterable


DEFAULT_PASSWORD = os.environ.get("SEED_PASSWORD", "Password123!")


@dataclass(frozen=True)
class DemoUser:
    email: str
    display_name: str
    role: str
    phone_number: str | None = None
    zone: str | None = None


DEMO_USERS: tuple[DemoUser, ...] = (
    DemoUser(
        email="citizen@demo.cleancity.dev",
        display_name="Casey Citizen",
        role="citizen",
        phone_number="+15550100001",
    ),
    DemoUser(
        email="collector@demo.cleancity.dev",
        display_name="Cory Collector",
        role="collector",
        phone_number="+15550100002",
        zone="Ward 4",
    ),
    DemoUser(
        email="admin@demo.cleancity.dev",
        display_name="Avery Admin",
        role="admin",
        phone_number="+15550100003",
    ),
)


def _load_app_bindings():
    """Import the app's User model, password hasher, token issuer, and session factory.

    `create_access_token` should return a signed JWT whose payload includes
    at least `sub` and `role` claims. Adjust paths to match your project.
    """
    try:
        from app.models.user import User  # type: ignore
        from app.core.security import hash_password, create_access_token  # type: ignore
        from app.db.session import SessionLocal  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(
            "Could not import app bindings. Edit _load_app_bindings() in "
            f"seed_demo_users.py to match your project layout. ({exc})"
        )
    return User, hash_password, create_access_token, SessionLocal


def _upsert(session, User, hash_password: Callable[[str], str], user: DemoUser) -> str:
    """Insert the user if absent, otherwise reset password + role. Returns action label."""
    existing = session.query(User).filter(User.email == user.email).one_or_none()
    hashed = hash_password(DEFAULT_PASSWORD)

    if existing is None:
        row = User(
            email=user.email,
            hashed_password=hashed,
            display_name=user.display_name,
            phone_number=user.phone_number,
            role=user.role,
            zone=user.zone,
            is_active=True,
        )
        session.add(row)
        return "created"

    existing.hashed_password = hashed
    existing.display_name = user.display_name
    existing.phone_number = user.phone_number
    existing.role = user.role
    existing.zone = user.zone
    existing.is_active = True
    return "updated"


def _decode_unverified(token: str) -> dict:
    """Best-effort decode of a JWT payload for display only (no signature check)."""
    import base64, json
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(payload_b64.encode()))
    except Exception:
        return {}


def seed(users: Iterable[DemoUser] = DEMO_USERS) -> None:
    User, hash_password, create_access_token, SessionLocal = _load_app_bindings()

    with SessionLocal() as session:
        results: list[tuple[DemoUser, str, str, dict]] = []
        for u in users:
            action = _upsert(session, User, hash_password, u)
            results.append((u, action, "", {}))
        session.commit()

        # Re-fetch to get persisted ids, then mint a JWT per user.
        minted: list[tuple[DemoUser, str, str, dict]] = []
        for u, action, _, _ in results:
            row = session.query(User).filter(User.email == u.email).one()
            try:
                token = create_access_token(
                    {"sub": str(row.id), "role": row.role, "email": row.email}
                )
            except TypeError:
                # Some implementations take (subject, role=...) instead of a dict.
                token = create_access_token(str(row.id), role=row.role)  # type: ignore[misc]
            minted.append((u, action, token, _decode_unverified(token)))

    print("\nCleanCity demo accounts ready:")
    print("-" * 72)
    print(f"{'ROLE':<10} {'EMAIL':<36} {'PASSWORD':<16} STATUS")
    print("-" * 72)
    for u, action, _, _ in minted:
        print(f"{u.role:<10} {u.email:<36} {DEFAULT_PASSWORD:<16} {action}")
    print("-" * 72)

    print("\nDemo JWT tokens (paste into Authorization: Bearer <token>):")
    for u, _, token, claims in minted:
        print("\n" + "=" * 72)
        print(f"{u.role.upper()}  —  {u.email}")
        print(f"  expected route: /{u.role}")
        if claims:
            shown = {k: claims.get(k) for k in ("sub", "role", "email", "exp") if k in claims}
            print(f"  claims: {shown}")
        print(f"  token: {token}")
    print("=" * 72)
    print("\nSign in at http://localhost:3000/login or test directly with curl:")
    print("  curl -H 'Authorization: Bearer <token>' http://localhost:8000/users/me\n")


if __name__ == "__main__":
    try:
        seed()
    except SystemExit:
        raise
    except Exception as exc:  # pragma: no cover
        print(f"Seed failed: {exc}", file=sys.stderr)
        sys.exit(1)
