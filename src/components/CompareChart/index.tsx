import { AppBarChart } from "../charts";
import { useChartTheme } from "../../hooks/useChartTheme";

interface CompareData {
  label: string;
  before: number;
  after: number;
}

interface CompareChartProps {
  title: string;
  data: CompareData[];
  beforeLabel?: string;
  afterLabel?: string;
  height?: number;
}

export function CompareChart({
  title,
  data,
  beforeLabel = "清理前",
  afterLabel = "清理后",
  height = 250,
}: CompareChartProps) {
  const theme = useChartTheme();

  return (
    <div className="bg-bg-secondary rounded-xl p-5 mb-6 shadow-[var(--shadow-md)] border border-border/50">
      <h3 className="mt-0 mb-4 text-[0.85rem] font-semibold uppercase tracking-wider text-text-secondary">{title}</h3>
      <AppBarChart
        data={data as unknown as Array<Record<string, unknown>>}
        bars={[
          { dataKey: 'before', name: beforeLabel, color: theme.colors.muted },
          { dataKey: 'after', name: afterLabel, color: theme.colors.success },
        ]}
        xAxisKey="label"
        grouped
        height={height}
      />
    </div>
  );
}
