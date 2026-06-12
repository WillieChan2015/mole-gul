import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { tooltipStyles, darkTooltipStyles } from './tooltipStyles';

interface BarConfig {
  dataKey: string;
  name: string;
  color?: string;
}

interface AppBarChartProps {
  data: Record<string, unknown>[];
  bars: BarConfig[];
  xAxisKey: string;
  direction?: 'horizontal' | 'vertical';
  stacked?: boolean;
  grouped?: boolean;
  showLabel?: boolean;
  labelFormatter?: (value: number) => string;
  valueFormatter?: (value: number) => string;
  height?: number;
  onClick?: (data: Record<string, unknown>) => void;
}

export function AppBarChart({
  data,
  bars,
  xAxisKey,
  direction = 'vertical',
  stacked = false,
  grouped = false,
  showLabel = false,
  labelFormatter,
  valueFormatter,
  height = 300,
  onClick,
}: AppBarChartProps) {
  const theme = useChartTheme();
  const currentTooltipStyles = theme.isDark ? darkTooltipStyles : tooltipStyles;

  const isHorizontal = direction === 'horizontal';

  const handleClick = (e: unknown) => {
    const event = e as { activePayload?: Array<{ payload?: Record<string, unknown> }> };
    if (onClick && event?.activePayload?.[0]?.payload) {
      onClick(event.activePayload[0].payload);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        onClick={onClick ? handleClick : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} />
        {isHorizontal ? (
          <>
            <XAxis type="number" tick={{ fill: theme.colors.text, fontSize: theme.fontSize.small }} tickFormatter={valueFormatter} />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              tick={{ fill: theme.colors.text, fontSize: theme.fontSize.small }}
              width={100}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: theme.colors.text, fontSize: theme.fontSize.small }}
            />
            <YAxis
              tick={{ fill: theme.colors.text, fontSize: theme.fontSize.small }}
              tickFormatter={valueFormatter}
              width={valueFormatter ? 70 : undefined}
            />
          </>
        )}
        <Tooltip
          contentStyle={currentTooltipStyles.contentStyle}
          itemStyle={currentTooltipStyles.itemStyle}
          labelStyle={currentTooltipStyles.labelStyle}
          formatter={valueFormatter ? ((value: number) => [valueFormatter(value)]) as never : undefined}
        />
        <Legend />
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color || theme.colors.series[index]}
            stackId={stacked ? 'stack' : undefined}
            label={showLabel ? {
              position: 'top',
              fill: theme.colors.text,
              fontSize: theme.fontSize.small,
              formatter: labelFormatter as never,
            } : undefined}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {grouped &&
              data.map((_entry, entryIndex) => (
                <Cell
                  key={entryIndex}
                  fill={bar.color || theme.colors.series[index]}
                  fillOpacity={0.8 + (entryIndex * 0.05)}
                />
              ))}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
