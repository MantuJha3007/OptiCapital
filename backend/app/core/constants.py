"""Financial and risk constants."""

# ──────────────────────────────────────────────
# Risk score component weights (must sum to 1.0)
# ──────────────────────────────────────────────
RISK_WEIGHT_VOLATILITY = 0.30
RISK_WEIGHT_DRAWDOWN = 0.25
RISK_WEIGHT_CONCENTRATION = 0.20
RISK_WEIGHT_LIQUIDITY = 0.15
RISK_WEIGHT_MARKET_STRESS = 0.10

# ──────────────────────────────────────────────
# Risk level thresholds
# ──────────────────────────────────────────────
RISK_LEVEL_SAFE = "SAFE"          # 0-30
RISK_LEVEL_WARNING = "WARNING"    # 30-60
RISK_LEVEL_STRESS = "STRESS"     # 60-80
RISK_LEVEL_CRISIS = "CRISIS"     # 80-100

ENVELOPE_GREEN = "GREEN"
ENVELOPE_YELLOW = "YELLOW"
ENVELOPE_ORANGE = "ORANGE"
ENVELOPE_RED = "RED"

RISK_THRESHOLDS = {
    RISK_LEVEL_SAFE: (0, 30),
    RISK_LEVEL_WARNING: (30, 60),
    RISK_LEVEL_STRESS: (60, 80),
    RISK_LEVEL_CRISIS: (80, 100),
}

RISK_ENVELOPE_MAP = {
    RISK_LEVEL_SAFE: ENVELOPE_GREEN,
    RISK_LEVEL_WARNING: ENVELOPE_YELLOW,
    RISK_LEVEL_STRESS: ENVELOPE_ORANGE,
    RISK_LEVEL_CRISIS: ENVELOPE_RED,
}

MAX_SINGLE_ASSET_WEIGHT = 0.50

# ──────────────────────────────────────────────
# Transaction cost
# ──────────────────────────────────────────────
DEFAULT_TRANSACTION_COST_RATE = 0.001  # 0.1%

# ──────────────────────────────────────────────
# Market data
# ──────────────────────────────────────────────
TRADING_DAYS_PER_YEAR = 252

# ──────────────────────────────────────────────
# Rebalance actions
# ──────────────────────────────────────────────
ACTION_HOLD = "HOLD"
ACTION_REBALANCE = "REBALANCE"
ACTION_CRISIS_PROTECTION = "CRISIS_PROTECTION"

# ──────────────────────────────────────────────
# Alert severities
# ──────────────────────────────────────────────
SEVERITY_INFO = "INFO"
SEVERITY_WARNING = "WARNING"
SEVERITY_CRITICAL = "CRITICAL"
