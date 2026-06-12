import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "../../lib/invoke";

interface InstallerFile {
  name: string;
  path: string;
  size: number;
  extension: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function Installer() {
  const { t } = useTranslation(["installer", "common"]);
  const [files, setFiles] = useState<InstallerFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<InstallerFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<InstallerFile[]>("scan_installers");
      setFiles(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    const confirmed = window.confirm(
      t("deleteConfirm", {
        name: selected.name,
        path: selected.path,
        size: formatSize(selected.size),
      })
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await invoke<string>("delete_installer", { path: selected.path });
      setSelected(null);
      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }, [selected, fetchFiles]);

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={fetchFiles} disabled={loading}>
            {loading ? t("common:loading") : t("common:refresh")}
          </button>
          {selected && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? t("common:deleting") : `${t("common:delete")} "${selected.name}"`}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}

      {files.length > 0 && (
        <p className="text-text-secondary text-sm mb-4">
          {t("fileCount", { count: files.length })}
        </p>
      )}

      {loading && files.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-text-secondary">{t("scanning")}</p>
        </div>
      ) : !loading && files.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📂</div>
          <p className="text-lg text-text-secondary">{t("noFiles")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full border-collapse text-[0.9rem] text-left">
            <thead>
              <tr>
                <th className="bg-bg-tertiary/50 border-b-2 border-border py-2 px-3 font-semibold">{t("common:name")}</th>
                <th className="bg-bg-tertiary/50 border-b-2 border-border py-2 px-3 font-semibold">{t("location")}</th>
                <th className="bg-bg-tertiary/50 border-b-2 border-border py-2 px-3 font-semibold text-right whitespace-nowrap">{t("common:size")}</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.path}
                  className={`cursor-pointer hover:bg-bg-tertiary/50 ${selected?.path === file.path ? "bg-accent/8" : ""}`}
                  onClick={() =>
                    setSelected(selected?.path === file.path ? null : file)
                  }
                >
                  <td className="border-b border-border py-2 px-3">
                    {file.name}
                    <span className="bg-bg-tertiary rounded px-1.5 py-0.5 text-[0.8rem] ml-1">.{file.extension}</span>
                  </td>
                  <td className="border-b border-border py-2 px-3 font-['SF Mono',Menlo,Monaco,monospace] text-[0.85rem]">
                    {file.path.includes("/Downloads/") ? "~/Downloads" : "~/Documents"}
                  </td>
                  <td className="border-b border-border py-2 px-3 text-right whitespace-nowrap">{formatSize(file.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
