# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Mole GUI 是 [Mole](https://github.com/tw93/Mole)（macOS 终端系统维护工具）的原生 macOS GUI 应用。技术栈为 **Tauri v2**（Rust 后端 + React 前端），仅支持 macOS。

## 常用命令

```bash
# 开发模式（同时启动 Vite + Tauri）
pnpm tauri dev

# 前端测试
pnpm test

# Rust 测试
cd src-tauri && cargo test

# 类型检查 + 生产构建
pnpm build    # 内含 tsc && vite build

# Rust 格式化和静态检查
cd src-tauri && cargo fmt && cargo clippy -- -D warnings

# Tauri 生产构建（输出 .dmg）
pnpm tauri build
```

## 架构

### 双进程结构

- **前端（src/）**：React 19 + TypeScript + Vite，负责 UI 渲染
- **后端（src-tauri/）**：Rust，负责调用 Mole CLI 和系统操作

### 后端（src-tauri/src/）

每个功能模块一个文件（`clean.rs`、`analyze.rs`、`optimize.rs` 等），通过 `lib.rs` 注册 Tauri 命令。关键模块：

- `mole/` — Mole CLI 命令封装层，负责 subprocess 调用和输出解析
- `system_info.rs` — 系统信息采集（不依赖 Mole）
- `installer.rs` — 直接用 Rust 扫描 `~/Downloads` + `~/Documents`（因为 Mole 的 installer 命令无非交互模式）

Tauri 命令使用 `#[tauri::command]` 宏，错误返回 `Result<T, String>`。

### 前端（src/）

- `components/` — 按功能分目录的 React 组件（Dashboard、Clean、Analyze 等）
- `lib/invoke.ts` — Tauri invoke 封装，含浏览器环境检测
- `lib/useMoleCommand.ts` — 通用异步命令 hook，封装了 loading/error/progress 状态管理

### Mole 命令调用模式

不同命令的调用和解析方式不同：

| 命令 | 调用方式 | 解析方式 |
|------|----------|----------|
| analyze, history, uninstall | `--json` 参数 | JSON 反序列化 |
| clean, optimize | `MOLE_DRY_RUN=1` + `NO_COLOR=1` | 文本解析（section 分组） |
| purge | `MOLE_DRY_RUN=1` + `NO_COLOR=1` | 汇总文本 + export 文件 |
| installer | Rust 直接扫描 | 结构化数据 |

### 关键依赖

- `mole-src/` — git submodule，指向 tw93/Mole 仓库

## 代码规范

- **包管理**：使用 pnpm，不要使用 npm 或 yarn
- **提交信息**：Conventional Commits 格式（`feat(scope): description`）
- **Rust**：`cargo fmt` + `cargo clippy -- -D warnings`
- **TypeScript**：严格模式，`pnpm build` 包含类型检查
- **测试**：前端用 Vitest + jsdom，Rust 用标准 `#[test]`

## 环境注意事项

- `pnpm tauri dev` 期望固定端口 1420，失败则报错
- Vite 忽略 `src-tauri/` 目录的文件监听
- 非 Tauri 环境（纯浏览器）调用 invoke 会抛错，开发时需注意
