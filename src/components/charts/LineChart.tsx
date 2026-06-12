import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { tooltipStyles, darkTooltipStyles } from './tooltipStyles';

interface LineConfig {
  dataKey: string;
  name: string;
  color?: string;
}

interface AppLineChartProps {
  data: Record<string, unknown>[];
  lines: LineConfig[];
  xAxisKey: string;
  yAxisLabel?: string;
  fill?: boolean;
  hideEmptyTicks?: boolean;
  height?: number;
  onClick?: (data: Record<string, unknown>) => void;
}

export function AppLineChart({
  data,
  lines,
  xAxisKey,
  yAxisLabel,
  fill = false,
  hideEmptyTicks = false,
  height = 300,
  onClick,
}: AppLineChartProps) {
  const theme = useChartTheme();
  const currentTooltipStyles = theme.isDark ? darkTooltipStyles : tooltipStyles;

  const handleClick = (e: unknown) => {
    const event = e as { activePayload?: Array<{ payload?: Record<string, unknown> }> };
    if (onClick && event?.activePayload?.[0]?.payload) {
      onClick(event.activePayload[0].payload);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        onClick={onClick ? handleClick : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} />
        <XAxis
          dataKey={xAxisKey}
          tick={hideEmptyTicks
            ? (props: { x?: string | number; y?: string | number; payload?: { value?: string } }) => {
                const value = props.payload?.value;
                if (!value) return null;
                return (
                  <text
                    x={Number(props.x)}
                    y={Number(props.y ?? 0) + 14}
                    textAnchor="middle"
                    fill={theme.colors.text}
                    fontSize={theme.fontSize.small}
                  >
                    {value}
                  </text>
                );
              }
            : { fill: theme.colors.text, fontSize: theme.fontSize.small }
          }
          interval={0}
        />
        <YAxis
          tick={{ fill: theme.colors.text, fontSize: theme.fontSize.small }}
          label={
            yAxisLabel
              ? {
                  value: yAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  fill: theme.colors.text,
                }
              : undefined
          }
        />
        <Tooltip
          contentStyle={currentTooltipStyles.contentStyle}
          itemStyle={currentTooltipStyles.itemStyle}
          labelStyle={currentTooltipStyles.labelStyle}
        />
        <Legend />
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color || theme.colors.series[index]}
            fill={fill ? line.color || theme.colors.series[index] : 'none'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
            animationDuration={800}
            animationEasing="ease-out"
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
