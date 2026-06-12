import { useTranslation } from "react-i18next";

export type Tab =
  | "dashboard"
  | "clean"
  | "analyze"
  | "optimize"
  | "uninstall"
  | "history"
  | "installer"
  | "purge";

// --- Inline SVG Icons (20x20 viewBox) ---

const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconClean = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 17L5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 17L5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5 14L9 3L11 3L7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 3L15 3L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconAnalyze = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12.5 12.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 10L8 8L10 9L12 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconOptimize = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 2L5 11H10L9 18L15 9H10L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconUninstall = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 6V4C8 3.44772 8.44772 3 9 3H11C11.5523 3 12 3.44772 12 4V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5 6L6 17H14L15 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.5 9V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M11.5 9V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6V10L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 4L16 7L13 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconInstaller = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 10L10 14L14 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconPurge = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2C10 2 6 7 6 11C6 13.2091 7.79086 15 10 15C12.2091 15 14 13.2091 14 11C14 7 10 2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 15V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// --- Icon map ---

const ICONS: Record<Tab, React.FC> = {
  dashboard: IconDashboard,
  clean: IconClean,
  analyze: IconAnalyze,
  optimize: IconOptimize,
  uninstall: IconUninstall,
  history: IconHistory,
  installer: IconInstaller,
  purge: IconPurge,
};

// --- Nav items ---

interface NavItem {
  id: Tab;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard" },
  { id: "clean" },
  { id: "analyze" },
  { id: "optimize" },
  { id: "uninstall" },
  { id: "history" },
  { id: "installer" },
  { id: "purge" },
];

// --- Component ---

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  theme,
  onThemeToggle,
}: SidebarProps) {
  const { t, i18n } = useTranslation("sidebar");

  return (
    <aside className="flex flex-col w-[220px] min-w-[220px] h-screen bg-bg-secondary/72 backdrop-blur-[20px] backdrop-saturate-[180%] border-r border-border select-none overflow-y-auto">
      {/* Brand area */}
      <div className="pt-8 pb-4 px-6">
        <h2 className="m-0 text-[13px] font-semibold uppercase tracking-wider text-text-secondary flex items-baseline">
          Mole
          <span className="text-[10px] text-text-secondary ml-1 font-normal tracking-normal">
            v0.3.0
          </span>
        </h2>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-px px-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = ICONS[item.id];
          return (
            <button
              key={item.id}
              className={`relative flex items-center gap-2.5 py-[7px] px-2.5 rounded-md border-none bg-transparent text-text-primary text-[13px] font-normal text-left transition-all duration-150 ease-in-out font-[inherit] leading-[1.4] ${
                isActive
                  ? "text-accent font-medium"
                  : "hover:bg-bg-tertiary/60"
              }`}
              style={isActive ? { backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)' } : undefined}
              onClick={() => onTabChange(item.id)}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r bg-accent" />
              )}
              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-current">
                <Icon />
              </span>
              {t(item.id)}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="p-3 pl-4 pr-4 border-t border-border/40 flex flex-col gap-2">
        <button
          className="btn-ghost flex items-center gap-1.5 py-[5px] px-2.5 rounded-md text-xs font-[inherit] transition-all duration-150 ease-in-out"
          onClick={onThemeToggle}
        >
          <span className="text-sm">{theme === "dark" ? "☀" : "☾"}</span>
          {theme === "dark" ? t("light") : t("dark")}
        </button>
        <select
          className="w-full p-2 border border-border rounded-md bg-bg-secondary text-text-primary text-sm cursor-pointer appearance-none text-center hover:border-accent"
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>
    </aside>
  );
}
