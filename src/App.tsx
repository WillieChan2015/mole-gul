import { useState, useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import Sidebar, { type Tab } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Clean from "./components/Clean";
import Analyze from "./components/Analyze";
import Optimize from "./components/Optimize";
import Uninstall from "./components/Uninstall";
import History from "./components/History";
import Installer from "./components/Installer";
import Purge from "./components/Purge";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("mole-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mole-theme", theme);
  }, [theme]);

  // 全局键盘事件处理 - 支持 Cmd+C 复制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+C 复制
      if (e.metaKey && e.key === "c") {
        const selection = window.getSelection();
        if (selection && selection.toString()) {
          navigator.clipboard.writeText(selection.toString());
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Check for updates on mount
  useEffect(() => {
    check()
      .then(async (update) => {
        if (update) {
          const proceed = window.confirm(
            `A new version (${update.version}) is available. Download and install?`
          );
          if (proceed) {
            await update.downloadAndInstall();
          }
        }
      })
      .catch(() => {
        // Silently ignore update check failures (e.g. no endpoint configured)
      });
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const renderContent = () => {
    switch (tab) {
      case "dashboard":
        return <Dashboard />;
      case "clean":
        return <Clean />;
      case "analyze":
        return <Analyze />;
      case "optimize":
        return <Optimize />;
      case "uninstall":
        return <Uninstall />;
      case "history":
        return <History />;
      case "installer":
        return <Installer />;
      case "purge":
        return <Purge />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 顶部拖拽区域 - Overlay 模式下启用窗口拖拽 */}
      <div
        data-tauri-drag-region
        className="fixed top-0 left-0 right-0 h-7 z-50"
      />
      <Sidebar
        activeTab={tab}
        onTabChange={setTab}
        theme={theme}
        onThemeToggle={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto p-0 bg-bg-primary">{renderContent()}</main>
    </div>
  );
}

export default App;
