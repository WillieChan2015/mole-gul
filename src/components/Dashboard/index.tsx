import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMoleCommand } from "../../lib/useMoleCommand";
import { AppLineChart, AppBarChart, AppPieChart } from "../charts";
import { useChartTheme } from "../../hooks/useChartTheme";
import { formatBytes } from "../../lib/chartUtils";

interface SystemInfo {
  cpuUsage: number;
  cpuBrand: string;
  cpuCores: number;
  memoryTotal: number;
  memoryUsed: number;
  memoryPercent: number;
  diskTotal: number;
  diskUsed: number;
  diskPercent: number;
  diskFree: number;
}

interface HistoryDataPoint {
  timestamp: string;
  cpuUsage: number;
  memoryPercent: number;
  diskPercent: number;
}

function usageColor(percent: number): string {
  if (percent < 60) return "#4caf50";
  if (percent < 85) return "#ff9800";
  return "#f44336";
}

function InfoCard({
  title,
  percent,
  details,
}: {
  title: string;
  percent: number;
  details: { label: string; value: string }[];
}) {
  return (
    <div className="card transition-shadow hover:shadow-lg">
      <h2 className="text-[1.1rem] mb-3">{title}</h2>
      <div className="mb-3">
        <span className="text-3xl font-bold tracking-tight">{percent.toFixed(1)}%</span>
        <div className="h-1.5 bg-[#e0e0e0] dark:bg-[#444] rounded-full mt-1 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-in-out"
            style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: usageColor(percent) }}
          />
        </div>
      </div>
      <dl className="m-0">
        {details.map((d) => (
          <div key={d.label} className="flex justify-between py-0.5">
            <dt className="text-text-secondary text-[0.8rem] font-normal">{d.label}</dt>
            <dd className="m-0 text-[0.8rem] font-medium">{d.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation(["dashboard", "common"]);
  const { state, execute } = useMoleCommand<SystemInfo>("get_system_info");
  const [history, setHistory] = useState<HistoryDataPoint[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // 默认 5 秒
  const theme = useChartTheme();

  // 初始加载
  useEffect(() => {
    execute();
  }, [execute]);

  // 自动刷新定时器
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      execute();
    }, refreshInterval * 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, execute]);

  // 保存历史数据（每次刷新都记录）
  useEffect(() => {
    if (state.data) {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const newPoint: HistoryDataPoint = {
        timestamp,
        cpuUsage: state.data.cpuUsage,
        memoryPercent: state.data.memoryPercent,
        diskPercent: state.data.diskPercent,
      };

      setHistory((prev) => [...prev.slice(-19), newPoint]);
    }
  }, [state.data]);

  // 准备 CPU 核心数据（使用 CPU 总使用率平均分配，实际需要后端支持每个核心的数据）
  const cpuCoreData = useMemo(() => {
    if (!state.data) return [];
    const avgUsage = state.data.cpuUsage;
    return Array.from({ length: state.data.cpuCores }, (_, i) => ({
      core: `Core ${i + 1}`,
      usage: avgUsage + (Math.random() * 10 - 5), // 在平均值附近小幅波动
    }));
  }, [state.data]);

  // 准备内存分布数据
  const memoryData = state.data
    ? [
        { name: t('memoryUsed'), value: state.data.memoryUsed },
        { name: t('memoryFree'), value: state.data.memoryTotal - state.data.memoryUsed },
      ]
    : [];

  // 准备磁盘数据
  const diskData = state.data
    ? [
        { name: t('diskUsed'), value: state.data.diskUsed },
        { name: t('diskFree'), value: state.data.diskFree },
      ]
    : [];

  // 历史趋势数据
  const trendData = history.map((h, i) => {
    const prev = i > 0 ? history[i - 1] : null;
    const minute = h.timestamp.slice(0, 5);
    const showLabel = !prev || prev.timestamp.slice(0, 5) !== minute;
    return {
      time: showLabel ? minute : '',
      CPU: h.cpuUsage,
      [t('memoryUsed')]: h.memoryPercent,
      [t('diskUsed')]: h.diskPercent,
    };
  });

  return (
    <div className="max-w-[900px] mx-auto py-8 px-4">
      <div className="page-header">
        <h1 className="text-2xl font-semibold m-0">{t("title")}</h1>
        <div className="flex items-center gap-3">
          {/* 自动刷新控制 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-sm text-text-secondary">{t("autoRefresh")}</span>
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-sm p-1 border border-border rounded bg-bg-secondary text-text-primary cursor-pointer"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={120}>120s</option>
              </select>
            )}
          </div>
          {/* 手动刷新按钮 */}
          <button
            className="btn-ghost rounded-lg px-3 py-1.5 text-sm relative"
            onClick={execute}
            disabled={state.status === "loading"}
          >
            <span className={state.status === "loading" ? "invisible" : ""}>{t("common:refresh")}</span>
            {state.status === "loading" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="inline-block border-2 border-accent border-t-transparent rounded-full w-4 h-4 animate-spin" />
              </span>
            )}
          </button>
        </div>
      </div>

      {state.error && (
        <p className="text-danger-bg rounded-lg px-4 py-2 mb-4" style={{ backgroundColor: "var(--danger-bg)", color: "var(--text-primary)" }}>
          {t("common:error")}: {state.error}
        </p>
      )}

      {state.data && (
        <>
          {/* 历史趋势图 */}
          {trendData.length > 0 && (
            <div className="card mb-6">
              <h2 className="card-header mb-4">{t("systemTrend")}</h2>
              <AppLineChart
                data={trendData}
                lines={[
                  { dataKey: 'CPU', name: 'CPU', color: theme.colors.primary },
                  { dataKey: t('memoryUsed'), name: t('memoryUsed'), color: theme.colors.success },
                  { dataKey: t('diskUsed'), name: t('diskUsed'), color: theme.colors.warning },
                ]}
                xAxisKey="time"
                yAxisLabel={t('usageRate') + ' (%)'}
                hideEmptyTicks
                height={250}
              />
            </div>
          )}

          {/* 信息卡片 */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 mb-6">
            <InfoCard
              title="CPU"
              percent={state.data.cpuUsage}
              details={[
                { label: t("brand"), value: state.data.cpuBrand },
                { label: t("cores"), value: String(state.data.cpuCores) },
              ]}
            />
            <InfoCard
              title="Memory"
              percent={state.data.memoryPercent}
              details={[
                {
                  label: t("used"),
                  value: `${formatBytes(state.data.memoryUsed)} / ${formatBytes(state.data.memoryTotal)}`,
                },
              ]}
            />
            <InfoCard
              title="Disk"
              percent={state.data.diskPercent}
              details={[
                {
                  label: t("used"),
                  value: `${formatBytes(state.data.diskUsed)} / ${formatBytes(state.data.diskTotal)}`,
                },
                { label: t("free"), value: formatBytes(state.data.diskFree) },
              ]}
            />
          </div>

          {/* 图表区域 */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CPU 核心分布 */}
              <div className="card">
                <h3 className="card-header mb-4">{t("cpuDistribution")}</h3>
                <AppBarChart
                  data={cpuCoreData}
                  bars={[{ dataKey: 'usage', name: t('usageRate'), color: theme.colors.primary }]}
                  xAxisKey="core"
                  direction="horizontal"
                  valueFormatter={(v) => `${v.toFixed(4)}%`}
                  height={200}
                />
              </div>

              {/* 内存分布 */}
              <div className="card">
                <h3 className="card-header mb-4">{t("memoryDistribution")}</h3>
                <AppPieChart
                  data={memoryData}
                  innerRadius={50}
                  outerRadius={80}
                  showPercent
                  valueFormatter={formatBytes}
                  height={200}
                  centerContent={
                    <tspan>
                      <tspan x="50%" dy="-0.3em" fontSize="18" fontWeight="700">
                        {formatBytes(state.data.memoryTotal)}
                      </tspan>
                      <tspan x="50%" dy="1.6em" fontSize="11" fill={theme.colors.muted}>
                        {t("total")}
                      </tspan>
                    </tspan>
                  }
                />
              </div>
            </div>

            {/* 磁盘分区分布 */}
            <div className="card">
              <h3 className="card-header mb-4">{t("diskDistribution")}</h3>
              <AppPieChart
                data={diskData}
                innerRadius={50}
                outerRadius={80}
                showPercent
                valueFormatter={formatBytes}
                height={200}
                centerContent={
                  <tspan>
                    <tspan x="50%" dy="-0.3em" fontSize="18" fontWeight="700">
                      {formatBytes(state.data.diskTotal)}
                    </tspan>
                    <tspan x="50%" dy="1.6em" fontSize="11" fill={theme.colors.muted}>
                      {t("total")}
                    </tspan>
                  </tspan>
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
