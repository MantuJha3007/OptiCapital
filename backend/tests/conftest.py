"""Test fixtures.

The database URL is set before any application module is imported, because
`app.database` builds its engine at import time. Each test session gets a
throwaway SQLite file, so the suite needs no PostgreSQL and no Docker and
never touches a developer's real database.
"""

import os
import tempfile
from pathlib import Path

import pytest

_TMP_DIR = tempfile.mkdtemp(prefix="opticapital-tests-")
_DB_PATH = Path(_TMP_DIR) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH.as_posix()}"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine, SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Portfolio, Scenario  # noqa: E402
from app.seed.seed_database import seed_all  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def seeded_db():
    """A seeded database, created once for the whole session."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_all(db)
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def client(seeded_db):
    """API client bound to the seeded database."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def portfolio(seeded_db) -> Portfolio:
    return seeded_db.query(Portfolio).first()


@pytest.fixture(scope="session")
def scenarios(seeded_db) -> dict[str, Scenario]:
    return {s.name: s for s in seeded_db.query(Scenario).all()}
