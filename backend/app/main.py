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
from app.api import master_state, market, reverse_stress, rag, copilot, learning


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for development; use Alembic in production)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AEGIS — Adaptive Capital Resilience & Risk-Control System",
    description="Institutional capital preservation, market regime intelligence, and risk-control platform",
    version="2.0.0",
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
app.include_router(master_state.router, prefix="/api", tags=["Master State"])
app.include_router(portfolio_api.router, prefix="/api", tags=["Portfolio"])
app.include_router(risk.router, prefix="/api", tags=["Risk"])
app.include_router(market.router, prefix="/api", tags=["Market Intelligence"])
app.include_router(reverse_stress.router, prefix="/api", tags=["Reverse Stress"])
app.include_router(rag.router, prefix="/api", tags=["RAG Intelligence"])
app.include_router(copilot.router, prefix="/api", tags=["AI Risk Manager"])
app.include_router(learning.router, prefix="/api", tags=["Audit & Learning"])
app.include_router(opt_api.router, prefix="/api", tags=["Optimization"])
app.include_router(scenarios.router, prefix="/api", tags=["Scenarios"])
app.include_router(rebalance_api.router, prefix="/api", tags=["Rebalance"])
