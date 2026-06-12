import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "../../lib/invoke";
import { AppBarChart, AppPieChart } from "../charts";
import { useChartTheme } from "../../hooks/useChartTheme";

interface HistoryActions {
  removed: number;
  trashed: number;
  skipped: number;
  failed: number;
  rebuilt: number;
  other: number;
}

interface HistorySession {
  command: string;
  started_at: string;
  ended_at: string;
  items: number;
  size: string;
  operation_count: number;
  actions: HistoryActions;
}

interface HistoryLogs {
  operations: string;
  deletions: string;
}

interface HistoryResponse {
  logs: HistoryLogs;
  limit: number;
  sessions: HistorySession[];
  deletions: unknown[];
}

const ACTION_KEYS = ["removed", "trashed", "skipped", "failed", "rebuilt", "other"] as const;

const BADGE_STYLES: Record<string, string> = {
  removed: "bg-danger-bg text-danger",
  trashed: "bg-warning-bg text-warning",
  skipped: "bg-bg-tertiary text-text-secondary",
  failed: "bg-danger-bg text-danger",
  rebuilt: "bg-success-bg text-success",
  other: "bg-bg-tertiary text-text-secondary",
};

export default function History() {
  const { t } = useTranslation(["history", "common"]);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'timeline'>('chart');
  const theme = useChartTheme();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<HistoryResponse>("history_list");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const cleanTrendData = data?.sessions.map((session) => ({
    date: new Date(session.started_at).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    }),
    size: parseFloat(session.size) || 0,
    command: session.command,
  })) || [];

  const commandDistribution = data?.sessions.reduce((acc, session) => {
    acc[session.command] = (acc[session.command] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const commandPieData = Object.entries(commandDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const actionStats = data?.sessions.map((session) => ({
    date: new Date(session.started_at).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    }),
    [t("success")]: session.actions.removed + session.actions.trashed + session.actions.rebuilt,
    [t("failed")]: session.actions.failed,
    [t("skipped")]: session.actions.skipped,
  })) || [];

  const actionDistribution = data?.sessions.reduce(
    (acc, session) => {
      acc.removed += session.actions.removed;
      acc.trashed += session.actions.trashed;
      acc.skipped += session.actions.skipped;
      return acc;
    },
    { removed: 0, trashed: 0, skipped: 0 }
  ) || { removed: 0, trashed: 0, skipped: 0 };

  const actionPieData = [
    { name: t("removed"), value: actionDistribution.removed },
    { name: t("trashed"), value: actionDistribution.trashed },
    { name: t("skipped"), value: actionDistribution.skipped },
  ];

  const segBase = "px-3 py-1.5 text-sm cursor-pointer transition-colors";
  const segInactive = "text-text-secondary hover:text-text-primary";
  const segActive = "bg-bg-secondary text-text-primary shadow-sm rounded-md";

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex gap-3 items-center">
          <button onClick={fetchHistory} disabled={loading} className="btn-ghost">
            {loading ? t("common:loading") : t("common:refresh")}
          </button>
          <div className="inline-flex rounded-lg bg-bg-tertiary p-0.5">
            <button
              className={`${segBase} ${viewMode === 'chart' ? segActive : segInactive}`}
              onClick={() => setViewMode('chart')}
            >
              {t("chart")}
            </button>
            <button
              className={`${segBase} ${viewMode === 'timeline' ? segActive : segInactive}`}
              onClick={() => setViewMode('timeline')}
            >
              {t("timeline")}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}

      {loading && !data ? (
        <p className="text-text-secondary">{t("loadingHistory")}</p>
      ) : data && data.sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg text-text-secondary">{t("noHistory")}</p>
        </div>
      ) : data ? (
        <>
          <div className="flex gap-4 mb-4 text-sm text-text-secondary">
            <span>{t("sessionCount", { count: data.sessions.length, limit: data.limit })}</span>
          </div>

          {viewMode === 'chart' ? (
            <div className="flex flex-col gap-6">
              {/* 清理量趋势图 */}
              <div className="card">
                <div className="card-header">{t("cleanTrend")}</div>
                <AppBarChart
                  data={cleanTrendData}
                  bars={[
                    {
                      dataKey: 'size',
                      name: t("freedSpace"),
                      color: theme.colors.primary,
                    },
                  ]}
                  xAxisKey="date"
                  height={250}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* 命令分布饼图 */}
                <div className="card">
                  <div className="card-header">{t("commandDistribution")}</div>
                  <AppPieChart
                    data={commandPieData}
                    innerRadius={50}
                    outerRadius={80}
                    showPercent
                    height={250}
                  />
                </div>

                {/* 清理类型分布饼图 */}
                <div className="card">
                  <div className="card-header">{t("cleanTypeDistribution")}</div>
                  <AppPieChart
                    data={actionPieData}
                    innerRadius={50}
                    outerRadius={80}
                    showPercent
                    height={250}
                  />
                </div>
              </div>

              {/* 操作结果统计 */}
              <div className="card">
                <div className="card-header">{t("actionStats")}</div>
                <AppBarChart
                  data={actionStats}
                  bars={[
                    { dataKey: t("success"), name: t("success"), color: theme.colors.success },
                    { dataKey: t("failed"), name: t("failed"), color: theme.colors.error },
                    { dataKey: t("skipped"), name: t("skipped"), color: theme.colors.muted },
                  ]}
                  xAxisKey="date"
                  stacked
                  height={250}
                />
              </div>
            </div>
          ) : (
            <div className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-border" />
              {data.sessions.map((session, i) => (
                <div className="relative mb-6 card hover:shadow-lg transition-shadow" key={i}>
                  {/* Timeline dot */}
                  <div className="absolute -left-8 top-5 w-3 h-3 rounded-full bg-accent border-[3px] border-bg-primary shadow-sm" />
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm capitalize">{session.command}</span>
                    <span className="text-xs text-text-secondary">
                      {session.started_at} &mdash; {session.ended_at}
                    </span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 mt-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-text-secondary uppercase tracking-wide">{t("items")}</span>
                      <span className="text-sm font-medium">{session.items.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-text-secondary uppercase tracking-wide">{t("common:size")}</span>
                      <span className="text-sm font-medium">{session.size}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-text-secondary uppercase tracking-wide">{t("operations")}</span>
                      <span className="text-sm font-medium">{session.operation_count}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ACTION_KEYS.filter((k) => session.actions[k] > 0).map((k) => (
                      <span
                        key={k}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${BADGE_STYLES[k]}`}
                      >
                        {k}: {session.actions[k]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
