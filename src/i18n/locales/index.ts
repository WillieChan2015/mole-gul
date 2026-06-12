import zhCommon from './zh/common.json';
import zhSidebar from './zh/sidebar.json';
import zhDashboard from './zh/dashboard.json';
import zhClean from './zh/clean.json';
import zhAnalyze from './zh/analyze.json';
import zhOptimize from './zh/optimize.json';
import zhUninstall from './zh/uninstall.json';
import zhHistory from './zh/history.json';
import zhInstaller from './zh/installer.json';
import zhPurge from './zh/purge.json';

import enCommon from './en/common.json';
import enSidebar from './en/sidebar.json';
import enDashboard from './en/dashboard.json';
import enClean from './en/clean.json';
import enAnalyze from './en/analyze.json';
import enOptimize from './en/optimize.json';
import enUninstall from './en/uninstall.json';
import enHistory from './en/history.json';
import enInstaller from './en/installer.json';
import enPurge from './en/purge.json';

export const resources = {
  zh: {
    common: zhCommon,
    sidebar: zhSidebar,
    dashboard: zhDashboard,
    clean: zhClean,
    analyze: zhAnalyze,
    optimize: zhOptimize,
    uninstall: zhUninstall,
    history: zhHistory,
    installer: zhInstaller,
    purge: zhPurge,
  },
  en: {
    common: enCommon,
    sidebar: enSidebar,
    dashboard: enDashboard,
    clean: enClean,
    analyze: enAnalyze,
    optimize: enOptimize,
    uninstall: enUninstall,
    history: enHistory,
    installer: enInstaller,
    purge: enPurge,
  },
};

export const namespaces = [
  'common',
  'sidebar',
  'dashboard',
  'clean',
  'analyze',
  'optimize',
  'uninstall',
  'history',
  'installer',
  'purge',
];
