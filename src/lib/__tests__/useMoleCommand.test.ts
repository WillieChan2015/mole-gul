import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMoleCommand } from "../useMoleCommand";

// Mock Tauri 环境

beforeEach(() => {
  // 模拟 Tauri 环境
  (window as any).__TAURI_INTERNALS__ = {};
});

afterEach(() => {
  // 恢复原始 window
  delete (window as any).__TAURI_INTERNALS__;
});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockListen = vi.fn((_event: string, _handler: unknown) => Promise.resolve(vi.fn()));

vi.mock("@tauri-apps/api/event", () => ({
  listen: mockListen,
}));

vi.mock("../invoke", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../invoke")>();
  return {
    ...actual,
    invoke: vi.fn(),
  };
});

import { invoke } from "../invoke";

const mockedInvoke = vi.mocked(invoke);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useMoleCommand", () => {
  describe("initial state", () => {
    it("should start with idle status and null data", () => {
      const { result } = renderHook(() => useMoleCommand("test-cmd"));

      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.data).toBeNull();
      expect(result.current.state.error).toBeNull();
    });
  });

  describe("execute", () => {
    it("should transition to loading when execute is called", async () => {
      let resolveInvoke!: (value: string) => void;
      mockedInvoke.mockImplementation(
        () => new Promise((resolve) => { resolveInvoke = resolve; }),
      );

      const { result } = renderHook(() => useMoleCommand<string>("test-cmd"));

      await act(async () => {
        result.current.execute();
      });

      expect(result.current.state.status).toBe("loading");
      expect(result.current.state.data).toBeNull();
      expect(result.current.state.error).toBeNull();

      await act(async () => {
        resolveInvoke("done");
      });
    });

    it("should transition to success with data on successful command", async () => {
      mockedInvoke.mockResolvedValue({ name: "mole" });

      const { result } = renderHook(() =>
        useMoleCommand<{ name: string }>("test-cmd"),
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.status).toBe("success");
      expect(result.current.state.data).toEqual({ name: "mole" });
      expect(result.current.state.error).toBeNull();
    });

    it("should transition to error on failed command", async () => {
      mockedInvoke.mockRejectedValue(new Error("command failed"));

      const { result } = renderHook(() => useMoleCommand("test-cmd"));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.status).toBe("error");
      expect(result.current.state.data).toBeNull();
      expect(result.current.state.error).toBe("command failed");
    });

    it("should handle non-Error thrown values", async () => {
      mockedInvoke.mockRejectedValue("raw string error");

      const { result } = renderHook(() => useMoleCommand("test-cmd"));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.status).toBe("error");
      expect(result.current.state.error).toBe("raw string error");
    });

    it("should reset cancelled ref on each execute call", async () => {
      mockedInvoke.mockResolvedValue("first");

      const { result } = renderHook(() => useMoleCommand<string>("test-cmd"));

      // First execute + cancel cycle
      await act(async () => {
        result.current.execute();
      });
      act(() => {
        result.current.cancel();
      });

      expect(result.current.state.status).toBe("idle");

      // Second execute should work normally after cancel
      mockedInvoke.mockResolvedValue("second");
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.status).toBe("success");
      expect(result.current.state.data).toBe("second");
    });
  });

  describe("progress events", () => {
    it("should update progress from listen events", async () => {
      let progressHandler!: (event: { payload: string }) => void;
      mockListen.mockImplementation((_event: string, handler: unknown) => {
        progressHandler = handler as (event: { payload: string }) => void;
        return Promise.resolve(vi.fn());
      });

      let resolveInvoke!: (value: string) => void;
      mockedInvoke.mockImplementation(
        () => new Promise((resolve) => { resolveInvoke = resolve; }),
      );

      const { result } = renderHook(() => useMoleCommand<string>("test-cmd"));

      await act(async () => {
        result.current.execute();
      });

      // Wait for listen to be set up
      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith(
          "test-cmd:progress",
          expect.any(Function),
        );
      });

      // Simulate progress event
      act(() => {
        progressHandler({ payload: "50%" });
      });

      expect(result.current.state.progress).toBe("50%");

      await act(async () => {
        resolveInvoke("done");
      });
    });
  });

  describe("cancel", () => {
    it("should set status back to idle when cancelled", async () => {
      let resolveInvoke!: (value: string) => void;
      mockedInvoke.mockImplementation(
        () => new Promise((resolve) => { resolveInvoke = resolve; }),
      );

      const { result } = renderHook(() => useMoleCommand<string>("test-cmd"));

      await act(async () => {
        result.current.execute();
      });

      expect(result.current.state.status).toBe("loading");

      act(() => {
        result.current.cancel();
      });

      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.data).toBeNull();
      expect(result.current.state.error).toBeNull();

      // Resolve the pending invoke to avoid unhandled rejection
      await act(async () => {
        resolveInvoke("late");
      });
    });

    it("should not update state after cancel", async () => {
      let resolveInvoke!: (value: string) => void;
      mockedInvoke.mockImplementation(
        () => new Promise((resolve) => { resolveInvoke = resolve; }),
      );

      const { result } = renderHook(() => useMoleCommand<string>("test-cmd"));

      await act(async () => {
        result.current.execute();
      });

      // Cancel while loading
      act(() => {
        result.current.cancel();
      });

      // Now resolve the original invoke
      await act(async () => {
        resolveInvoke("data");
      });

      // State should still be idle, not success
      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.data).toBeNull();
    });

    it("should not update state on error after cancel", async () => {
      let rejectInvoke!: (err: Error) => void;
      mockedInvoke.mockImplementation(
        () => new Promise((_resolve, reject) => { rejectInvoke = reject; }),
      );

      const { result } = renderHook(() => useMoleCommand("test-cmd"));

      await act(async () => {
        result.current.execute();
      });

      act(() => {
        result.current.cancel();
      });

      await act(async () => {
        rejectInvoke(new Error("should not set error"));
      });

      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.error).toBeNull();
    });
  });
});
