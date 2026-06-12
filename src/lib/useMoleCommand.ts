import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "./invoke";

// 检测是否在 Tauri 环境中
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// 动态导入 listen，避免在非 Tauri 环境中报错
async function safeListen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void> {
  if (!isTauri()) {
    console.warn(`[Dev Mode] Cannot listen to "${event}" outside Tauri environment`);
    return () => {};
  }
  const { listen } = await import("@tauri-apps/api/event");
  return listen<T>(event, handler);
}

export interface CommandState<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
  progress?: string;
}

export function useMoleCommand<T>(command: string, args?: Record<string, unknown>) {
  const [state, setState] = useState<CommandState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  const cancelledRef = useRef(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      unlistenRef.current?.();
    };
  }, []);

  const execute = useCallback(async () => {
    // Prevent concurrent calls
    if (state.status === "loading") return;
    cancelledRef.current = false;
    // 保留旧数据，避免界面闪烁
    setState((prev) => ({ status: "loading", data: prev.data, error: null }));

    // Listen for progress events if the command emits them
    const progressEvent = `${command}:progress`;
    unlistenRef.current?.();
    unlistenRef.current = await safeListen<string>(progressEvent, (event) => {
      if (!cancelledRef.current) {
        setState((prev) => ({ ...prev, progress: event.payload }));
      }
    });

    try {
      const data = await invoke<T>(command, args);
      if (!cancelledRef.current) {
        setState({ status: "success", data, error: null });
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setState({
          status: "error",
          data: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      unlistenRef.current?.();
      unlistenRef.current = null;
    }
  }, [command, args]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    unlistenRef.current?.();
    unlistenRef.current = null;
    setState({ status: "idle", data: null, error: null });
  }, []);

  return { state, execute, cancel };
}
