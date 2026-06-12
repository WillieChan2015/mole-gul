# Changelog

本文件记录 Mole GUI 项目的重要变更。

## [0.4.0] - 2024-06-11

### 开源发布准备 ✅

- **必需文件**：
  - 添加 MIT LICENSE 文件
  - 添加 CONTRIBUTING.md 贡献指南
  - 更新 README.md（安装说明、使用说明、贡献指南、许可证）

- **元数据更新**：
  - 更新 package.json（name, version, description, license, repository, author, keywords）
  - 更新 Cargo.toml（name, version, description, authors, license, repository, keywords, categories）
  - 更新 tauri.conf.json（productName, version）
  - 修复 main.rs 中的 lib 名称引用

### 测试验证

- ✅ Rust 测试：39 个测试全部通过
- ✅ 前端测试：34 个测试全部通过

## [0.3.0] - 2024-06-11

### 功能增强 ✅

- **Analyze 功能完善**：
  - 从 Mole release v1.42.0 下载 Go 二进制文件
  - 支持 Overview 模式（扫描热点目录）
  - 支持 Directory 模式（扫描指定目录）
  - 更新 build.rs 处理符号链接

- **选择性清理功能**：
  - 添加 `clean_list_scan` 命令读取 clean-list.txt
  - 添加 `clean_execute_selected` 命令支持选择性清理
  - 前端添加勾选框和 section 级别全选功能
  - 使用 `trash` crate 删除文件（安全删除）

- **实时进度显示**：
  - Clean 扫描操作实时显示进度
  - 使用 `cmd.spawn()` + `BufReader` 逐行读取输出
  - 发送 `clean:progress` Tauri 事件
  - 前端显示 spinner、行数统计和最后 20 行输出

### 测试验证

- ✅ Rust 测试：39 个测试全部通过
- ✅ 前端测试：34 个测试全部通过

## [0.2.1] - 2024-06-11

### 代码修复 ✅

- **修复 `mole_dry_run_command` 未使用问题**：
  - 添加 `run_mole_dry_run_with_timeout` 函数到 `mole/mod.rs`
  - 更新 `clean.rs`、`optimize.rs`、`purge.rs` 使用新函数
  - 移除手动设置 `MOLE_DRY_RUN` 环境变量
  - 消除编译 warning

### 测试验证

- ✅ Rust 编译：0 个 warning
- ✅ Rust 测试：35 个测试全部通过
- ✅ 前端测试：34 个测试全部通过

## [0.2.0] - 2024-06-11

### 测试和质量保证 ✅

- **Rust 单元测试**：35个测试全部通过
  - `mole/mod.rs`：21个测试（路径解析、命令构建、超时控制）
  - `system_info.rs`：7个测试（数据采集、序列化）
  - 命令模块：7个测试（clean、uninstall、history 序列化/反序列化）

- **React 组件测试**：34个测试全部通过
  - `useMoleCommand` hook：10个测试（状态管理、取消、进度事件）
  - Clean 文本解析：8个测试（Section、Item、Warning、Summary）
  - Optimize 文本解析：8个测试（Section、Action、Summary）
  - Purge 文本解析：6个测试（Summary、DryRun）

- **测试配置**：
  - 安装 vitest、@testing-library/react、@testing-library/jest-dom
  - 配置 vitest 环境（jsdom）
  - 添加 `pnpm test` 脚本

### CI/CD 配置 ✅

- **GitHub Actions 工作流**：
  - `test.yml`：push 和 PR 时自动运行测试
  - `build.yml`：tag push 时自动构建并发布 Release
- **自动更新配置**：GitHub Releases 格式

### 技术细节

- **测试覆盖率**：69个测试（35 Rust + 34 React）
- **CI/CD**：GitHub Actions 自动化测试和构建
- **依赖更新**：添加测试依赖（vitest、@testing-library/react 等）

## [0.1.0] - 2024-06-10

### Phase 0：可行性验证 ✅

- 验证 Mole CLI 命令可通过 `std::process::Command` 调用
- 验证 `NO_COLOR=1` 禁用 ANSI 颜色码
- 验证 `history --json`、`uninstall --list` JSON 解析
- 验证 `clean`、`optimize`、`purge` dry-run 文本解析
- 验证 `child.kill()` 超时终止机制
- 8/8 测试全部通过

### Phase 1：项目脚手架 + Mole 集成 ✅

- 初始化 Tauri v2 项目（Rust 后端 + React 前端）
- 配置 git submodule 引入 Mole 源码
- 实现 `build.rs`（Go 二进制检测 + Shell 脚本复制）
- 实现 `mole/mod.rs` 统一命令调用层
- 集成 `sysinfo` crate 系统信息采集

### Phase 2：核心模块 ✅

- Dashboard 首页（CPU/内存/磁盘概览）
- Clean 模块（dry-run 文本解析 → 分类展示 → 执行清理）
- Analyze 模块（JSON 驱动，overview + directory 模式）
- `useMoleCommand` hook（状态管理、取消、进度事件）

### Phase 3：扩展模块 ✅

- Uninstall 模块（`--list` JSON 反序列化，应用列表 + 搜索）
- Optimize 模块（dry-run 文本解析，任务列表 + 一键执行）
- Purge 模块（汇总文本解析，项目列表 + 选择清理）
- Installer 模块（Rust 直接扫描 ~/Downloads + ~/Documents）
- History 模块（JSON 驱动操作历史时间线）

### Phase 4：打磨 ✅

- 毛玻璃侧边栏（`backdrop-filter: blur(20px) saturate(180%)`）
- 暗色模式支持（统一使用 `data-theme` 属性）
- 通知功能（Clean/Optimize 完成时发送系统通知）
- 自动更新配置（Tauri updater，GitHub Releases 格式）

### 技术细节

- **Tauri 命令**：13个（get_system_info、clean_scan/execute、analyze_path、uninstall_list/app、optimize_scan/execute、purge_scan/execute、installer_scan/delete、history_list）
- **React 组件**：9个（Dashboard、Clean、Analyze、Uninstall、Optimize、Purge、Installer、History、Sidebar）
- **依赖**：tauri、serde、serde_json、sysinfo、libc、trash、tauri-plugin-notification、tauri-plugin-updater
- **构建**：cargo check 通过（1个warning），pnpm build 通过

### 已知问题

- `mole_dry_run_command` 函数未使用（warning）
- Analyze 功能需要 Go 二进制（从 Mole release 下载）
- Clean 不支持选择性清理（只能全量清理）

### 下一阶段

详见 [superpowers/roadmap/next_phase_plan.md](./superpowers/roadmap/next_phase_plan.md)

## [0.0.1] - 2024-06-04

### 项目初始化

- 创建项目目录结构
- 分析 Mole 架构和 CLI 接口
- 确定技术选型（Tauri v2）
- 制定实施方案（superpowers/architecture/implementation_plan.md）
