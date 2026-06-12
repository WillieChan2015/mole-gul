export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return `-${formatBytes(-bytes)}`;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function toPercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export interface PieDataPoint {
  name: string;
  value: number;
  percent?: number;
}

export function toPieData(
  data: Record<string, number>,
  total: number
): PieDataPoint[] {
  return Object.entries(data).map(([name, value]) => ({
    name,
    value,
    percent: toPercent(value, total),
  }));
}

export function getColorByValue(
  value: number,
  thresholds: { low: number; mid: number },
  colors: { low: string; mid: string; high: string }
): string {
  if (value < thresholds.low) return colors.low;
  if (value < thresholds.mid) return colors.mid;
  return colors.high;
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}
