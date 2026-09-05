import { useEffect, useState } from 'react';

interface RiskGaugeProps {
  score: number;
  level: string;
  regime?: string;
}

const RISK_LEVEL_COLORS: Record<string, string> = {
  SAFE: '#10b981',      // Emerald Green
  WARNING: '#f59e0b',   // Amber
  STRESS: '#f97316',    // Coral Orange
  CRISIS: '#ef4444',    // Crimson Red
};

export function RiskGauge({ score, level, regime = 'CALM' }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const activeColor = RISK_LEVEL_COLORS[level] || '#6366f1';

  // Semicircle gauge: 180 degrees arc
  // Radius = 85, Center = (120, 110)
  const radius = 80;
  const cx = 110;
  const cy = 105;
  const strokeWidth = 14;

  // Arc math: from 180 deg (left) to 0 deg (right)
  const arcLength = Math.PI * radius;
  const progressOffset = arcLength - (Math.min(Math.max(animatedScore, 0), 100) / 100) * arcLength;

  // Angle for needle/indicator dot
  const angleRad = Math.PI - (Math.min(Math.max(animatedScore, 0), 100) / 100) * Math.PI;
  const indicatorX = cx + radius * Math.cos(angleRad);
  const indicatorY = cy - radius * Math.sin(angleRad);

  return (
    <div className="risk-gauge-institutional">
      <div className="gauge-svg-container">
        <svg width="220" height="135" viewBox="0 0 220 135">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={activeColor} floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Background track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Value arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={progressOffset}
            filter="url(#gaugeGlow)"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />

          {/* Ticks at 0, 30, 60, 80, 100 */}
          {[0, 30, 60, 80, 100].map((tick) => {
            const tickRad = Math.PI - (tick / 100) * Math.PI;
            const innerR = radius - 12;
            const outerR = radius - 6;
            const x1 = cx + innerR * Math.cos(tickRad);
            const y1 = cy - innerR * Math.sin(tickRad);
            const x2 = cx + outerR * Math.cos(tickRad);
            const y2 = cy - outerR * Math.sin(tickRad);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Active pointer circle */}
          <circle
            cx={indicatorX}
            cy={indicatorY}
            r="6"
            fill="#ffffff"
            stroke={activeColor}
            strokeWidth="3"
            filter="url(#gaugeGlow)"
            style={{
              transition: 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </svg>

        {/* Center Readout */}
        <div className="gauge-readout">
          <div className="gauge-score-value" style={{ color: activeColor }}>
            {score.toFixed(0)}
            <span className="gauge-score-max">/100</span>
          </div>
          <div className="gauge-status-row">
            <span className={`risk-badge ${level.toLowerCase()}`}>{level}</span>
            <span className={`regime-badge ${regime.toLowerCase()}`}>{regime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
