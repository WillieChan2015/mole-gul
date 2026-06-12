import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "../../lib/invoke";
import { safeListen } from "../../lib/safeListen";
import { AppBarChart, AppPieChart, AppTreemap, AppSunburst } from "../charts";
import { useChartTheme } from "../../hooks/useChartTheme";
import { formatBytes } from "../../lib/chartUtils";

interface AnalyzeEntry {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  cleanable?: boolean;
}

interface LargeFile {
  name: string;
  path: string;
  size: number;
}

interface AnalyzeResult {
  path: string;
  overview: boolean;
  entries: AnalyzeEntry[];
  large_files: LargeFile[];
  total_size: number;
  total_files: number;
}

export default function Analyze() {
  const { t } = useTranslation(["analyze", "common"]);
  const [path, setPath] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [chartType, setChartType] = useState<'treemap' | 'sunburst' | 'bar'>('treemap');
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const unlistenRefs = useRef<(() => void)[]>([]);
  const theme = useChartTheme();

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      unlistenRefs.current.forEach((unlisten) => unlisten());
    };
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!path.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressLines([]);

    // Clean up previous listeners
    unlistenRefs.current.forEach((unlisten) => unlisten());
    unlistenRefs.current = [];

    // Set up progress listener
    const unlistenProgress = await safeListen<string>("analyze:progress", (event) => {
      setProgressLines((prev) => [...prev, event.payload]);
    });
    unlistenRefs.current.push(unlistenProgress);

    // Set up completed listener
    const unlistenCompleted = await safeListen<void>("analyze:completed", () => {
      setLoading(false);
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    });
    unlistenRefs.current.push(unlistenCompleted);

    // 异步执行命令（不等待完成）
    invoke<string>("analyze_path", { path: path.trim() }).then((raw) => {
      const data: AnalyzeResult = JSON.parse(raw);
      setResult(data);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    });
  }, [path]);

  const sortedEntries = result
    ? [...result.entries].sort((a, b) => b.size - a.size)
    : [];

  const sortedLargeFiles = result
    ? [...result.large_files].sort((a, b) => b.size - a.size)
    : [];

  // 准备目录大小数据（TOP 20）
  const topEntries = sortedEntries.slice(0, 20).map((entry) => ({
    name: entry.name.length > 15 ? entry.name.substring(0, 15) + '...' : entry.name,
    size: entry.size,
    path: entry.path,
  }));

  // 准备大文件数据（TOP 10）
  const topLargeFiles = sortedLargeFiles.slice(0, 10).map((file) => ({
    name: file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name,
    size: file.size,
    path: file.path,
  }));

  // 准备目录类型分布数据
  const dirTypeData = result
    ? [
        {
          name: t('dir'),
          value: result.entries.filter((e) => e.is_dir).length,
        },
        {
          name: t('file'),
          value: result.entries.filter((e) => !e.is_dir).length,
        },
      ]
    : [];

  // 准备 Treemap 数据
  const treemapData = result
    ? [{
        name: result.path.split('/').pop() || 'root',
        size: result.total_size,
        children: sortedEntries.slice(0, 20).map((entry) => ({
          name: entry.name,
          size: entry.size,
          path: entry.path,
        })),
      }]
    : [];

  // 准备 Sunburst 数据
  const sunburstData = result
    ? [{
        name: result.path.split('/').pop() || 'root',
        size: result.total_size,
        children: sortedEntries.slice(0, 20).map((entry) => ({
          name: entry.name,
          size: entry.size,
        })),
      }]
    : [];

  const segBase = "px-3 py-1.5 text-sm cursor-pointer transition-colors";
  const segInactive = "text-text-secondary hover:text-text-primary";
  const segActive = "bg-bg-secondary text-text-primary shadow-sm rounded-md";

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="inline-flex rounded-lg bg-bg-tertiary p-0.5">
          <button
            className={`${segBase} ${viewMode === 'chart' ? segActive : segInactive}`}
            onClick={() => setViewMode('chart')}
          >
            {t("chart")}
          </button>
          <button
            className={`${segBase} ${viewMode === 'table' ? segActive : segInactive}`}
            onClick={() => setViewMode('table')}
          >
            {t("table")}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder={t("placeholder")}
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          className="flex-1 rounded-lg focus:ring-2 focus:ring-accent/30"
        />
        <button onClick={handleAnalyze} disabled={loading || !path.trim()}>
          {loading ? t("common:analyzing") : t("title")}
        </button>
      </div>

      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

      {/* Progress area with card style */}
      {loading && (
        <div className="card mb-6 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary text-sm font-medium">
            <span className="inline-block w-[14px] h-[14px] border-2 border-[#ccc] border-t-accent rounded-full animate-spin" />
            <span>{progressLines.length > 0 ? t("scanningLines", { count: progressLines.length }) : t("common:analyzing")}</span>
          </div>
          {progressLines.length > 0 && (
            <pre className="m-0 p-3 max-h-[300px] overflow-y-auto font-mono text-xs leading-relaxed bg-bg-tertiary text-text-primary whitespace-pre-wrap break-all rounded-xl mt-2">
              {progressLines.slice(-20).join("\n")}
            </pre>
          )}
        </div>
      )}

      {result && (
        <>
          <div className="info-banner bg-info-bg rounded-xl mb-6">
            <span className="truncate max-w-[320px]">{t("common:path")}: <strong>{result.path}</strong></span>
            <span>{t("totalSize")}: <strong>{formatBytes(result.total_size)}</strong></span>
            <span>{t("files")}: <strong>{result.total_files.toLocaleString()}</strong></span>
          </div>

          {viewMode === 'chart' ? (
            <div className="flex flex-col gap-6">
              {/* Chart type toggle */}
              <div className="inline-flex rounded-lg bg-bg-tertiary p-0.5 mb-4">
                <button
                  className={`${segBase} ${chartType === 'treemap' ? segActive : segInactive}`}
                  onClick={() => setChartType('treemap')}
                >
                  {t("treemap")}
                </button>
                <button
                  className={`${segBase} ${chartType === 'sunburst' ? segActive : segInactive}`}
                  onClick={() => setChartType('sunburst')}
                >
                  {t("sunburst")}
                </button>
                <button
                  className={`${segBase} ${chartType === 'bar' ? segActive : segInactive}`}
                  onClick={() => setChartType('bar')}
                >
                  {t("bar")}
                </button>
              </div>

              {/* 目录空间可视化 */}
              <div className="card">
                <div className="card-header">{t("dirSpaceDistribution")}</div>
                {chartType === 'treemap' && (
                  <AppTreemap data={treemapData} height={400} />
                )}
                {chartType === 'sunburst' && (
                  <AppSunburst
                    data={sunburstData}
                    height={400}
                    centerContent={
                      <div className="text-center">
                        <div className="text-[1rem] font-semibold">
                          {formatBytes(result.total_size)}
                        </div>
                        <div className="text-[0.75rem] text-text-secondary">
                          {t("totalSize")}
                        </div>
                      </div>
                    }
                  />
                )}
                {chartType === 'bar' && (
                  <AppBarChart
                    data={topEntries}
                    bars={[{ dataKey: 'size', name: t('common:size'), color: theme.colors.primary }]}
                    xAxisKey="name"
                    direction="horizontal"
                    height={400}
                  />
                )}
              </div>

              <div className="grid grid-cols-[1.5fr_1fr] gap-6">
                {/* 大文件 TOP 排行 */}
                <div className="card">
                  <div className="card-header">{t("topLargeFiles")}</div>
                  <AppBarChart
                    data={topLargeFiles}
                    bars={[
                      {
                        dataKey: 'size',
                        name: t('common:size'),
                        color: theme.colors.warning,
                      },
                    ]}
                    xAxisKey="name"
                    height={300}
                  />
                </div>

                {/* 目录类型分布 */}
                <div className="card">
                  <div className="card-header">{t("dirFileDistribution")}</div>
                  <AppPieChart
                    data={dirTypeData}
                    innerRadius={50}
                    outerRadius={80}
                    showPercent
                    height={300}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-[1rem] m-0 mb-2 pb-1 border-b border-border">{t("entries", { count: sortedEntries.length })}</h2>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full border-collapse text-[0.9rem]">
                    <thead>
                      <tr className="bg-bg-tertiary/50">
                        <th className="text-left px-3 py-2 font-semibold text-text-secondary">{t("common:name")}</th>
                        <th className="text-left px-3 py-2 font-semibold text-text-secondary">{t("common:path")}</th>
                        <th className="text-center w-[3em] px-3 py-2 font-semibold text-text-secondary">{t("common:type")}</th>
                        <th className="text-right whitespace-nowrap px-3 py-2 font-semibold text-text-secondary">{t("common:size")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((entry, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-bg-tertiary/20" : ""}>
                          <td className="text-left px-3 py-2">{entry.name}</td>
                          <td className="text-left px-3 py-2">{entry.path}</td>
                          <td className="text-center w-[3em] px-3 py-2">{entry.is_dir ? t("dir") : t("file")}</td>
                          <td className="text-right whitespace-nowrap px-3 py-2">{formatBytes(entry.size)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {sortedLargeFiles.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-[1rem] m-0 mb-2 pb-1 border-b border-border">{t("largeFiles", { count: sortedLargeFiles.length })}</h2>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full border-collapse text-[0.9rem]">
                      <thead>
                        <tr className="bg-bg-tertiary/50">
                          <th className="text-left px-3 py-2 font-semibold text-text-secondary">{t("common:name")}</th>
                          <th className="text-left px-3 py-2 font-semibold text-text-secondary">{t("common:path")}</th>
                          <th className="text-right whitespace-nowrap px-3 py-2 font-semibold text-text-secondary">{t("common:size")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedLargeFiles.map((file, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-bg-tertiary/20" : ""}>
                            <td className="text-left px-3 py-2">{file.name}</td>
                            <td className="text-left px-3 py-2">{file.path}</td>
                            <td className="text-right whitespace-nowrap px-3 py-2">{formatBytes(file.size)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
