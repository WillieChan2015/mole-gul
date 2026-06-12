import { invoke as tauriInvoke } from "@tauri-apps/api/core";

// 检测是否在 Tauri 环境中
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    console.warn(`[Dev Mode] Tauri command "${command}" called outside Tauri environment`);
    throw new Error(`Tauri not available: ${command}`);
  }
  return tauriInvoke<T>(command, args);
}
