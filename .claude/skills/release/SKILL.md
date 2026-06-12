---
name: release
description: 'Use when preparing, validating, or executing mole-gui releases. Trigger whenever the user wants to cut a version, bump semver, run pnpm tauri build, align CHANGELOG/package.json/git tags, publish to GitHub Releases, or create a GitHub Release.'
argument-hint: '目标版本、发布类型或发布任务，例如 0.4.0、patch、beta 发布'
user-invocable: true
---

# mole-gui Release

## 这个 skill 做什么

把本项目的发布流程收敛成一条可重复执行的工作流：维护 `CHANGELOG.md` 的 `Unreleased` 内容、本地准备 release commit 与 tag、触发 GitHub Actions 自动构建，并让 GitHub Release 正文与 changelog 对齐。

如需查看当前仓库的发布入口与相关文件，请先读 [project release files](./references/project-release-files.md)。

如果用户只想做**只读检查**、不希望任何命令改动仓库状态，请改用 `/release-audit`。

## 何时使用

当用户提到以下任一需求时使用：

- “准备发版” / “发一个 GitHub Release”
- “帮我 cut release / 发布 prerelease / beta / alpha”
- “帮我跑 `pnpm tauri build`”
- “检查 changelog、版本号、tag 是否对齐，然后继续发布”
- “触发 GitHub Release 自动化”

## 核心约束

- 本项目的自动 release 依赖推送 tag 后的 GitHub Actions（`.github/workflows/release.yml`）。
- `CHANGELOG.md` 是 GitHub Release 正文的唯一来源。
- `/release` 在执行任何会改动仓库状态的发布动作前，应先运行 `/release-dry-run` 向用户展示预演摘要。
- 本项目是 Tauri v2 应用，构建产物为 macOS .dmg 文件。
- 只有模板、没有真实条目的 `Unreleased` 视为“空”，必须阻止发版。

## 标准流程

1. **确认发布目标**
   - 判断是显式版本（如 `0.4.0`、`0.4.0-beta.1`）还是语义升级参数（如 `patch`、`minor`）。
   - 如果需要 GitHub prerelease，最终版本必须包含 `-`（如 `-beta.1`、`-alpha`、`-rc.0`）。

2. **维护 changelog**
   - 优先把发布说明写在 `CHANGELOG.md` 的 `## [Unreleased]` 下。
   - 确保存在真实条目，而不是只有 `Added / Changed / Fixed` 模板标题。
   - 如果 `Unreleased` 只有模板标题、没有真实条目，先执行 `/changelog-generator` 从 git 历史自动生成 changelog 条目，然后再继续发布流程。
   - 如果用户已经手工写好了目标版本标题，也允许直接复用。

3. **先做 dry-run 预演**
   - 运行 `/release-dry-run` 预演完整本地自动化流程。
   - 向用户汇总：
     - 当前版本 / 目标版本 / 预计 tag；
     - changelog 来源（复用已有版本标题 / 从 `Unreleased` 提升 / 被阻塞）；
     - release notes 预览；
     - blockers 与下一步建议。
   - 如果 dry-run 已经暴露 blocker，必须先停下，不要继续执行发布。

4. **更新版本号**
   - 更新 `package.json` 中的 `version` 字段
   - 更新 `src-tauri/tauri.conf.json` 中的 `version` 字段
   - 确保两个文件的版本号一致

5. **执行本地准备**
   - 运行前端测试：`pnpm test`
   - 运行后端测试：`cd src-tauri && cargo test`
   - 运行构建：`pnpm build`
   - 运行 Rust 检查：`cd src-tauri && cargo clippy -- -D warnings`
   - 检查代码格式：`cd src-tauri && cargo fmt -- --check`

6. **创建 release commit 和 tag**
   - 把 `Unreleased` 提升为 `## [version] - YYYY-MM-DD`
   - 重建 `## [Unreleased]` 模板
   - 创建本地 commit：`chore: release vX.Y.Z`
   - 创建本地 tag：`vX.Y.Z`

7. **复核本地产物**
   - 检查 `package.json` 的 `version`
   - 检查 `src-tauri/tauri.conf.json` 的 `version`
   - 检查 `CHANGELOG.md` 是否同时满足：
     - 目标版本章节存在；
     - `Unreleased` 已恢复为模板；
     - 发布说明没有丢失或串到别的版本。
   - 检查 git 状态，确认 release commit 和 tag 已创建，且无意外改动。

8. **执行发布前校验**
   - 运行：
     - `pnpm test`
     - `cd src-tauri && cargo test`
     - `pnpm build`
     - `cd src-tauri && cargo clippy -- -D warnings`
     - `git diff --check`
   - **敏感信息检查**：扫描源码和配置文件，确认不存在真实密钥、token 或其他敏感信息泄露。
   - 只有全部通过，才可以继续推送。

9. **推送并触发远端发布**
   - 运行：
     - `git push`
     - `git push --tags`
   - GitHub Actions 会根据 `v*` tag 自动：
     - 构建 macOS ARM64 和 x86_64 版本；
     - 创建 GitHub Release；
     - 上传 .dmg 文件。

10. **发布后确认**
    - 检查 GitHub Actions `release.yml` 成功。
    - 检查 GitHub Release：
      - 标题与 tag 一致；
      - 正文来自对应 changelog 章节；
      - .dmg 文件已上传；
      - prerelease 标记是否符合预期。

## 分支判断

- **目标版本标题已存在**：直接复用现有章节，不必再次从 `Unreleased` 搬运。
- **`Unreleased` 只有模板**：必须停止并让用户先补真实发布说明。
- **目标 tag 已存在**：必须停止，避免覆盖既有 release。
- **仓库中有无关改动**：提醒用户 review；当前流程只提交版本号和 changelog 相关文件，不会顺手把别的改动打进 release commit。

## 完成标准

只有满足以下条件，才算这次发布准备或发布工作完成：

- `package.json.version`、`src-tauri/tauri.conf.json.version`、git tag、GitHub Release tag 四者一致；
- `CHANGELOG.md` 中存在对应版本章节；
- `pnpm test`、`cd src-tauri && cargo test`、`pnpm build`、`git diff --check` 全部通过；
- GitHub Actions 发布工作流成功；
- GitHub Release 已生成且内容正确，包含 .dmg 文件。

## 可直接触发这个 skill 的示例

- `/release 准备发布 0.4.0`
- `/release 帮我发布一个 0.4.0-beta.1`
- `/release 用 patch 规则准备一次本地 release`
- `/release 看看 changelog、tag 和 GitHub 发布链路是否对齐后直接继续`
- `/release 先帮我预演一遍 0.4.0 发布`
