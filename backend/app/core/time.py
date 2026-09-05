"""Shared time helper.

datetime.utcnow() is deprecated and scheduled for removal. The audit columns
are naive DateTime, so this returns UTC with the tzinfo stripped: the stored
value is unchanged, only the way it is produced.
"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Current UTC time, naive, matching the DateTime columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
