// 检测是否在 Tauri 环境中
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// 动态导入 listen，避免在非 Tauri 环境中报错
export async function safeListen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void> {
  if (!isTauri()) {
    console.warn(`[Dev Mode] Cannot listen to "${event}" outside Tauri environment`);
    return () => {};
  }
  const { listen } = await import("@tauri-apps/api/event");
  return listen<T>(event, handler);
}
