import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "../../lib/invoke";
import { safeListen } from "../../lib/safeListen";
import { ProgressRing } from "../charts";
import { useChartTheme } from "../../hooks/useChartTheme";

interface PurgeSummary {
  wouldFree: string;
  items: number;
  free: string;
}

interface ScanData {
  summary: PurgeSummary | null;
  isDryRun: boolean;
  rawOutput: string;
}

export function parsePurgeOutput(raw: string): ScanData {
  let summary: PurgeSummary | null = null;
  let isDryRun = false;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    if (/DRY RUN MODE/i.test(trimmed)) {
      isDryRun = true;
      continue;
    }

    // Summary: Would free: X | Items: N | Free: Y
    const summaryMatch = trimmed.match(
      /^Would free:\s*(\S+)\s*\|\s*Items:\s*(\d+)\s*\|\s*Free:\s*(\S+)$/
    );
    if (summaryMatch) {
      summary = {
        wouldFree: summaryMatch[1],
        items: parseInt(summaryMatch[2], 10),
        free: summaryMatch[3],
      };
    }
  }

  return { summary, isDryRun, rawOutput: raw };
}

export default function Purge() {
  const { t } = useTranslation(["purge", "common"]);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const unlistenRefs = useRef<(() => void)[]>([]);
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
    const unlistenProgress = await safeListen<string>("purge:progress", (event) => {
      setProgressLines((prev) => [...prev, event.payload]);
    });
    unlistenRefs.current.push(unlistenProgress);

    // Set up scan completed listener
    const unlistenCompleted = await safeListen<void>("purge:scan_completed", () => {
      setScanning(false);
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    });
    unlistenRefs.current.push(unlistenCompleted);

    // 异步执行命令（不等待完成）
    invoke<{ rawOutput: string }>("purge_scan").then((res) => {
      setScanData(parsePurgeOutput(res.rawOutput));
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
    const unlistenProgress = await safeListen<string>("purge:progress", (event) => {
      setProgressLines((prev) => [...prev, event.payload]);
    });
    unlistenRefs.current.push(unlistenProgress);

    // Set up execute completed listener
    const unlistenCompleted = await safeListen<void>("purge:execute_completed", () => {
      setExecuting(false);
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    });
    unlistenRefs.current.push(unlistenCompleted);

    // 异步执行命令（不等待完成）
    invoke<{ rawOutput: string }>("purge_execute").then((res) => {
      setResultMsg(t("purgeCompleted"));
      setScanData(parsePurgeOutput(res.rawOutput));
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setExecuting(false);
    });
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
              disabled={executing || scanning}
              className="bg-[var(--danger-color)] text-white border-[var(--danger-color)] hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? t("common:purging") : t("purge")}
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
          {t("dryRunMode")}
        </div>
      )}

      {scanData?.summary && (
        <div className="info-banner bg-[var(--info-bg)] rounded-xl mb-6 text-[0.95rem]">
          <span>{t("wouldFree")}: <strong>{scanData.summary.wouldFree}</strong></span>
          <span>{t("items")}: <strong>{scanData.summary.items}</strong></span>
          <span>{t("free")}: <strong>{scanData.summary.free}</strong></span>
        </div>
      )}

      {scanData?.summary && (
        <div className="mb-6">
          <div className="card">
            <h3 className="m-0 mb-4 text-base text-text-secondary text-center">{t("cleanableItems")}</h3>
            <div className="flex justify-center items-center py-4">
              <ProgressRing
                percent={100}
                size={150}
                strokeWidth={12}
                color={theme.colors.primary}
                centerContent={
                  <div className="text-center">
                    <div className="text-xl font-semibold">
                      {scanData.summary.items}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {t("itemCount")}
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
