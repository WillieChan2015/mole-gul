import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "../../lib/invoke";
import { safeListen } from "../../lib/safeListen";
import { AppBarChart, AppPieChart } from "../charts";
import { useChartTheme } from "../../hooks/useChartTheme";

interface AppInfo {
  name: string;
  bundle_id: string;
  source: string;
  uninstall_name: string;
  path: string;
  size: string;
}

export default function Uninstall() {
  const { t } = useTranslation(["uninstall", "common"]);
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AppInfo | null>(null);
  const [uninstalling, setUninstalling] = useState(false);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const unlistenRefs = useRef<(() => void)[]>([]);
  const theme = useChartTheme();

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      unlistenRefs.current.forEach((unlisten) => unlisten());
    };
  }, []);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgressLines([]);

    // Clean up previous listeners
    unlistenRefs.current.forEach((unlisten) => unlisten());
    unlistenRefs.current = [];

    // Set up progress listener
    const unlistenProgress = await safeListen<string>("uninstall:progress", (event) => {
      setProgressLines((prev) => [...prev, event.payload]);
    });
    unlistenRefs.current.push(unlistenProgress);

    // Set up scan completed listener
    const unlistenCompleted = await safeListen<void>("uninstall:scan_completed", () => {
      setLoading(false);
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    });
    unlistenRefs.current.push(unlistenCompleted);

    // 异步执行命令（不等待完成）
    invoke<AppInfo[]>("uninstall_list").then((result) => {
      setApps(result);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const filtered = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.bundle_id.toLowerCase().includes(q) ||
        app.source.toLowerCase().includes(q)
    );
  }, [apps, search]);

  const handleUninstall = useCallback(async () => {
    if (!selected) return;
    const confirmed = window.confirm(
      t("uninstallConfirm", {
        name: selected.name,
        path: selected.path,
        bundleId: selected.bundle_id,
      })
    );
    if (!confirmed) return;

    setUninstalling(true);
    setError(null);
    setProgressLines([]);

    // Clean up previous listeners
    unlistenRefs.current.forEach((unlisten) => unlisten());
    unlistenRefs.current = [];

    // Set up progress listener
    const unlistenProgress = await safeListen<string>("uninstall:progress", (event) => {
      setProgressLines((prev) => [...prev, event.payload]);
    });
    unlistenRefs.current.push(unlistenProgress);

    // Set up uninstall completed listener
    const unlistenCompleted = await safeListen<void>("uninstall:uninstall_completed", () => {
      setUninstalling(false);
      setSelected(null);
      fetchApps();
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    });
    unlistenRefs.current.push(unlistenCompleted);

    // 异步执行命令（不等待完成）
    invoke<string>("uninstall_app", { name: selected.uninstall_name }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setUninstalling(false);
    });
  }, [selected, fetchApps]);

  // 准备应用大小 TOP 排行数据
  const topApps = useMemo(() => {
    return [...apps]
      .sort((a, b) => {
        const sizeA = parseFloat(a.size) || 0;
        const sizeB = parseFloat(b.size) || 0;
        return sizeB - sizeA;
      })
      .slice(0, 10)
      .map((app) => ({
        name: app.name.length > 12 ? app.name.substring(0, 12) + '...' : app.name,
        size: parseFloat(app.size) || 0,
        bundleId: app.bundle_id,
      }));
  }, [apps]);

  // 准备应用来源分布数据
  const sourceDistribution = useMemo(() => {
    const distribution = apps.reduce((acc, app) => {
      acc[app.source] = (acc[app.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [apps]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="m-0">{t("title")}</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={fetchApps} disabled={loading}>
            {loading ? t("common:loading") : t("common:refresh")}
          </button>
          {selected && (
            <button
              onClick={handleUninstall}
              disabled={uninstalling}
              className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uninstalling ? t("common:deleting") : `${t("title")} "${selected.name}"`}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}

      {/* Progress area with card style */}
      {(loading || uninstalling) && (
        <div className="card mb-6 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary text-sm font-medium">
            <span className="inline-block w-[14px] h-[14px] border-2 border-[#ccc] border-t-accent rounded-full animate-spin" />
            <span>{progressLines.length > 0 ? t("scanningLines", { count: progressLines.length }) : t("common:scanning")}</span>
          </div>
          {progressLines.length > 0 && (
            <pre className="m-0 p-3 max-h-[300px] overflow-y-auto font-mono text-xs leading-relaxed bg-bg-tertiary text-text-primary whitespace-pre-wrap break-all rounded-xl mt-2">
              {progressLines.slice(-20).join("\n")}
            </pre>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg focus:ring-2 focus:ring-accent/30"
        />
        {apps.length > 0 && (
          <span className="text-[14px] text-text-secondary whitespace-nowrap">
            {t("appCount", { filtered: filtered.length, total: apps.length })}
          </span>
        )}
      </div>

      {apps.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-[1.5fr_1fr] gap-6">
            {/* 应用大小 TOP 排行 */}
            <div className="card">
              <h3 className="card-header">{t("appSizeTop10")}</h3>
              <AppBarChart
                data={topApps}
                bars={[
                  {
                    dataKey: 'size',
                    name: t('common:size'),
                    color: theme.colors.primary,
                  },
                ]}
                xAxisKey="name"
                height={300}
              />
            </div>

            {/* 应用来源分布 */}
            <div className="card">
              <h3 className="card-header">{t("appSourceDistribution")}</h3>
              <AppPieChart
                data={sourceDistribution}
                innerRadius={50}
                outerRadius={80}
                showPercent
                height={300}
              />
            </div>
          </div>
        </div>
      )}

      {loading && apps.length === 0 ? (
        <p>{t("loadingApps")}</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full border-collapse text-[14px] text-left">
            <thead>
              <tr>
                <th className="bg-bg-tertiary/50 border-b-2 border-border py-2 px-3 font-semibold">{t("common:name")}</th>
                <th className="bg-bg-tertiary/50 border-b-2 border-border py-2 px-3 font-semibold">Bundle ID</th>
                <th className="bg-bg-tertiary/50 border-b-2 border-border py-2 px-3 font-semibold">{t("common:source")}</th>
                <th className="bg-bg-tertiary/50 border-b-2 border-border py-2 px-3 font-semibold text-right whitespace-nowrap">{t("common:size")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr
                  key={app.bundle_id}
                  className={`cursor-pointer outline-none hover:bg-bg-tertiary/50 ${selected?.bundle_id === app.bundle_id ? "bg-accent/8" : ""}`}
                  onClick={() =>
                    setSelected(
                      selected?.bundle_id === app.bundle_id ? null : app
                    )
                  }
                >
                  <td className="border-b border-border py-2 px-3">{app.name}</td>
                  <td className="border-b border-border py-2 px-3 font-['SF Mono',Menlo,Monaco,monospace] text-[13px]">{app.bundle_id}</td>
                  <td className="border-b border-border py-2 px-3">{app.source}</td>
                  <td className="border-b border-border py-2 px-3 text-right whitespace-nowrap">{app.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
