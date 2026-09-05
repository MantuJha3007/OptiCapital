"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base

# Import all models so they are registered with Base.metadata
from app.models import (  # noqa: F401
    asset,
    portfolio,
    holding,
    market_data,
    risk_snapshot,
    optimization,
    scenario,
    alert,
    rebalance,
)

from app.api import health, portfolio as portfolio_api, risk, optimization as opt_api
from app.api import scenarios, rebalance as rebalance_api


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for development; use Alembic in production)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Smart Capital Guard",
    description="Financial capital management and risk-control MVP",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(portfolio_api.router, prefix="/api", tags=["Portfolio"])
app.include_router(risk.router, prefix="/api", tags=["Risk"])
app.include_router(opt_api.router, prefix="/api", tags=["Optimization"])
app.include_router(scenarios.router, prefix="/api", tags=["Scenarios"])
app.include_router(rebalance_api.router, prefix="/api", tags=["Rebalance"])
