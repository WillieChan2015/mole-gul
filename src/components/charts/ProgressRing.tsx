import { useChartTheme } from '../../hooks/useChartTheme';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  centerContent?: React.ReactNode;
  animated?: boolean;
}

export function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 8,
  color,
  centerContent,
  animated = true,
}: ProgressRingProps) {
  const theme = useChartTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  const fillColor = color || theme.colors.primary;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.grid}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: animated ? 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        />
      </svg>
      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {centerContent || (
          <span
            style={{
              fontSize: theme.fontSize.large,
              fontWeight: 600,
              color: theme.colors.text,
            }}
          >
            {Math.round(percent)}%
          </span>
        )}
      </div>
    </div>
  );
}
