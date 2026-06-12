import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "../../lib/invoke";
import { safeListen } from "../../lib/safeListen";
import { AppBarChart } from "../charts";
import { useChartTheme } from "../../hooks/useChartTheme";

interface OptimizeAction {
  name: string;
}

interface OptimizeSection {
  name: string;
  actions: OptimizeAction[];
}

interface DiagnosisInfo {
  lines: string[];
}

interface ScanData {
  sections: OptimizeSection[];
  diagnosis: DiagnosisInfo | null;
  summary: string | null;
  isDryRun: boolean;
  rawOutput: string;
}

export function parseOptimizeOutput(raw: string): ScanData {
  const sections: OptimizeSection[] = [];
  const diagnosisLines: string[] = [];
  let currentSection: OptimizeSection | null = null;
  let summary: string | null = null;
  let isDryRun = false;
  let inDiagnosis = false;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    // Dry run banner
    if (/DRY RUN MODE/i.test(trimmed)) {
      isDryRun = true;
      continue;
    }

    // Diagnosis block starts with PERFORMANCE DIAGNOSIS
    if (/PERFORMANCE DIAGNOSIS/i.test(trimmed)) {
      inDiagnosis = true;
      continue;
    }

    // Diagnosis lines start with specific markers
    if (inDiagnosis && (trimmed.startsWith("◎") || trimmed.startsWith("☞"))) {
      diagnosisLines.push(trimmed);
      continue;
    }

    // A blank line or section header ends diagnosis
    if (inDiagnosis && (trimmed === "" || trimmed.startsWith("➤"))) {
      inDiagnosis = false;
    }

    // Section header: ➤ Section Name
    const sectionMatch = trimmed.match(/^➤\s+(.+)$/);
    if (sectionMatch) {
      currentSection = { name: sectionMatch[1], actions: [] };
      sections.push(currentSection);
      continue;
    }

    // Action: → action description
    const actionMatch = trimmed.match(/^→\s+(.+)$/);
    if (actionMatch && currentSection) {
      currentSection.actions.push({ name: actionMatch[1] });
      continue;
    }

    // Summary line: "Would apply N optimizations" or "Dry Run Complete"
    if (/Would apply \d+ optimizations/i.test(trimmed)) {
      summary = trimmed;
    }
  }

  return {
    sections,
    diagnosis: diagnosisLines.length > 0 ? { lines: diagnosisLines } : null,
    summary,
    isDryRun,
    rawOutput: raw,
  };
}

export default function Optimize() {
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const unlistenRefs = useRef<(() => void)[]>([]);
  const { t } = useTranslation(["optimize", "common"]);
  const theme = useChartTheme();

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      unlistenRefs.current.forEach((unlisten) => unlisten());
    };
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setResultMsg(null);
    setProgressLines([]);

    // Clean up previous listeners
    unlistenRefs.current.forEach((unlisten) => unlisten());
    unlistenRefs.current = [];

    // Set up progress listener
    const unlistenProgress = await safeListen<string>("optimize:progress", (event) => {
      setProgressLines((prev) => [...prev, event.payload]);
    });
    unlistenRefs.current.push(unlistenProgress);

    // Set up scan completed listener
    const unlistenCompleted = await safeListen<void>("optimize:scan_completed", () => {
      setScanning(false);
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    });
    unlistenRefs.current.push(unlistenCompleted);

    // 异步执行命令（不等待完成）
    invoke<{ rawOutput: string }>("optimize_scan").then((res) => {
      setScanData(parseOptimizeOutput(res.rawOutput));
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setScanning(false);
    });
  }, []);

  const handleExecute = useCallback(async () => {
    setExecuting(true);
    setError(null);
    setResultMsg(null);
    setProgressLines([]);

    // Clean up previous listeners
    unlistenRefs.current.forEach((unlisten) => unlisten());
    unlistenRefs.current = [];

    // Set up progress listener
    const unlistenProgress = await safeListen<string>("optimize:progress", (event) => {
      setProgressLines((prev) => [...prev, event.payload]);
    });
    unlistenRefs.current.push(unlistenProgress);

    // Set up execute completed listener
    const unlistenCompleted = await safeListen<void>("optimize:execute_completed", () => {
      setExecuting(false);
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    });
    unlistenRefs.current.push(unlistenCompleted);

    // 异步执行命令（不等待完成）
    invoke<{ rawOutput: string }>("optimize_execute").then((res) => {
      setResultMsg("Optimizations applied successfully.");
      setScanData(parseOptimizeOutput(res.rawOutput));
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setExecuting(false);
    });
  }, []);

  const totalActions = scanData
    ? scanData.sections.reduce((sum, s) => sum + s.actions.length, 0)
    : 0;

  // 准备分类统计数据
  const categoryStats = scanData?.sections.map((section) => ({
    name: section.name.length > 10 ? section.name.substring(0, 10) + '...' : section.name,
    count: section.actions.length,
  })) || [];

  // 准备优化前后对比数据（需要后端支持实际性能指标）
  const comparisonData = useMemo(() => {
    // 暂无实际对比数据，返回空数组
    return [];
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="m-0">{t("title")}</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={handleScan} disabled={scanning || executing}>
            {scanning ? t("common:scanning") : t("scan")}
          </button>
          {scanData && (
            <button
              onClick={handleExecute}
              disabled={executing || scanning || totalActions === 0}
              className="bg-[var(--success-color)] text-white border-[var(--success-color)] hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? t("common:applying") : t("applyOptimizations", { count: totalActions })}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[var(--danger-color)]">{error}</p>}
      {resultMsg && <p className="text-[var(--success-color)]">{resultMsg}</p>}

      {/* Progress area with card style */}
      {(scanning || executing) && (
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

      {scanData?.isDryRun && (
        <div className="info-banner bg-[var(--info-bg)] rounded-xl mb-4 text-[0.9rem] text-[var(--accent-color)]">
          ℹ️ {t("dryRunMode")}
        </div>
      )}

      {scanData?.diagnosis && (
        <div className="py-3 px-4 bg-[var(--warning-bg)] rounded-xl mb-6 text-[0.95rem] leading-relaxed">
          <strong>⚠️ {t("performanceDiagnosis")}</strong>
          {scanData.diagnosis.lines.map((line, i) => (
            <p key={i} className="my-[0.15rem]">{line}</p>
          ))}
        </div>
      )}

      {scanData?.summary && (
        <div className="info-banner bg-[var(--success-bg)] rounded-xl mb-6 text-[0.95rem]">
          <span>✅ {scanData.summary}</span>
        </div>
      )}

      {scanData && (
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 分类统计 */}
            <div className="card">
              <div className="card-header">{t("categoryStats")}</div>
              <AppBarChart
                data={categoryStats}
                bars={[
                  {
                    dataKey: 'count',
                    name: t('optimizationCount'),
                    color: theme.colors.primary,
                  },
                ]}
                xAxisKey="name"
                height={250}
              />
            </div>

            {/* 优化前后对比 */}
            <div className="card">
              <div className="card-header">{t("beforeAfterComparison")}</div>
              {comparisonData.length > 0 ? (
                <AppBarChart
                  data={comparisonData}
                  bars={[
                    { dataKey: 'before', name: t('before'), color: theme.colors.muted },
                    { dataKey: 'after', name: t('after'), color: theme.colors.success },
                  ]}
                  xAxisKey="metric"
                  grouped
                  height={250}
                />
              ) : (
                <div className="flex items-center justify-center h-[250px] text-[var(--text-secondary)]">
                  {t("noComparisonData")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {scanData?.sections.map((section, si) => (
        <div key={si} className="mb-6">
          <h2 className="text-[1rem] m-0 mb-2 pb-1 border-b border-[var(--border-color)]">{section.name}</h2>
          <ul className="list-none m-0 p-0">
            {section.actions.map((action, ai) => (
              <li key={ai} className="flex items-center gap-2 py-[0.35rem] text-[0.9rem]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-color)] shrink-0" />
                <span className="text-[var(--success-color)] font-bold">&rarr;</span>
                <span>{action.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
