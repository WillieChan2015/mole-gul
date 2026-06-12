import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { resources, namespaces } from './locales';

function detectLanguage(): string {
  const stored = localStorage.getItem('mole-locale');
  if (stored === 'zh' || stored === 'en') return stored;
  return navigator.language.startsWith('zh') ? 'zh' : 'en';
}

const detectedLang = detectLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: detectedLang,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: namespaces,
  interpolation: { escapeValue: false },
});

// 初始化时更新菜单语言
invoke('update_menu_lang', { lang: detectedLang }).catch(() => {
  // 忽略错误（可能在浏览器环境中运行）
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('mole-locale', lng);
  // 更新 macOS 菜单语言
  invoke('update_menu_lang', { lang: lng }).catch(() => {
    // 忽略错误（可能在浏览器环境中运行）
  });
});

export default i18n;
