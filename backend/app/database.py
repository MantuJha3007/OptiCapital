"""SQLAlchemy engine, session factory, and declarative base.

PostgreSQL is the primary target and the one the audit story is written
against. SQLite is supported as a first-class alternative so the project can
be cloned and run without Docker — set DATABASE_URL=sqlite:///./opticapital.db
and everything else, including the full schema and audit trail, is identical.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        # FastAPI runs sync endpoints in a worker threadpool, so a connection
        # opened on one thread is reused on another. SQLite rejects that by
        # default; the pool below still serialises access.
        return {"connect_args": {"check_same_thread": False}}
    return {"pool_pre_ping": True}


engine = create_engine(settings.database_url, **_engine_kwargs(settings.database_url))


if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
        """SQLite ignores foreign keys unless asked, including ON DELETE CASCADE."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
