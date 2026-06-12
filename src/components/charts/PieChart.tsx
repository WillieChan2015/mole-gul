import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { tooltipStyles, darkTooltipStyles } from './tooltipStyles';

interface PieDataPoint {
  name: string;
  value: number;
  percent?: number;
}

interface AppPieChartProps {
  data: PieDataPoint[];
  innerRadius?: number;
  outerRadius?: number;
  showLabel?: boolean;
  showPercent?: boolean;
  centerContent?: React.ReactNode;
  valueFormatter?: (value: number) => string;
  height?: number;
  onClick?: (data: PieDataPoint) => void;
}

export function AppPieChart({
  data,
  innerRadius = 0,
  outerRadius = 80,
  showLabel = true,
  showPercent = false,
  centerContent,
  valueFormatter,
  height = 300,
  onClick,
}: AppPieChartProps) {
  const theme = useChartTheme();
  const currentTooltipStyles = theme.isDark ? darkTooltipStyles : tooltipStyles;

  const renderLabel = (props: { name?: string; percent?: number }) => {
    if (!showLabel) return null;
    const name = props.name || '';
    const percent = props.percent || 0;
    if (showPercent) return `${name} ${(percent * 100).toFixed(0)}%`;
    return name;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          dataKey="value"
          label={renderLabel}
          animationDuration={800}
          animationEasing="ease-out"
          onClick={onClick ? (e: { name?: string; value?: number }) => onClick({ name: e.name || '', value: e.value || 0 }) : undefined}
        >
          {data.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={theme.colors.series[index % theme.colors.series.length]}
              stroke={theme.colors.background}
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={currentTooltipStyles.contentStyle}
          itemStyle={currentTooltipStyles.itemStyle}
          labelStyle={currentTooltipStyles.labelStyle}
          formatter={valueFormatter ? ((value: number) => [valueFormatter(value)]) as never : undefined}
        />
        <Legend />
        {centerContent && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            fill={theme.colors.text}
            fontSize={theme.fontSize.large}
          >
            {centerContent}
          </text>
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
