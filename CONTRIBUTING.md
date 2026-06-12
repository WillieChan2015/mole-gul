# Contributing to Mole GUI

感谢你对 Mole GUI 项目的关注！本文档将帮助你快速参与贡献。

## 目录

- [开发环境搭建](#开发环境搭建)
- [代码规范](#代码规范)
- [提交 Pull Request](#提交-pull-request)
- [提交 Issue](#提交-issue)

## 开发环境搭建

### 前置依赖

- **macOS**（本项目仅支持 macOS）
- [Rust](https://www.rust-lang.org/tools/install)（stable）
- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)（推荐）或 npm
- Xcode Command Line Tools

### 初始化

```bash
# 克隆项目（含 submodule）
git clone --recursive <repo-url>
cd mole-gui

# 如果已 clone 但没加 --recursive
git submodule update --init --recursive

# 安装前端依赖
pnpm install

# 启动开发模式（同时启动 Vite + Tauri）
pnpm tauri dev
```

### 运行测试

```bash
# 前端测试
pnpm test

# Rust 测试
cd src-tauri && cargo test
```

项目包含 73 个测试（39 Rust + 34 React），提交前请确保全部通过。

## 代码规范

### Rust（src-tauri/）

- 遵循 [Rust 官方风格指南](https://doc.rust-lang.org/book/ch03-03-how-functions-work.html)
- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 检查代码质量
- Tauri 命令使用 `#[tauri::command]` 宏，保持函数签名简洁
- 错误处理使用 `Result<T, String>` 返回给前端，内部可以使用 `anyhow`

```bash
# 格式化
cargo fmt

# 静态检查
cargo clippy -- -D warnings
```

### TypeScript / React（src/）

- 使用 TypeScript 严格模式
- 使用 `pnpm build`（包含 `tsc`）检查类型
- 组件采用函数式组件 + Hooks
- 使用 Vitest 编写测试

```bash
# 类型检查 + 构建
pnpm build
```

### 提交信息格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

类型（type）：
- `feat` - 新功能
- `fix` - 修复 bug
- `docs` - 文档变更
- `style` - 代码格式（不影响功能）
- `refactor` - 重构
- `test` - 测试相关
- `chore` - 构建/工具变更

示例：
```
feat(clean): add selective cleaning with checkboxes
fix(dashboard): correct memory display on Apple Silicon
docs: update README with Phase 4 features
```

## 提交 Pull Request

1. Fork 本仓库并创建分支
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. 进行修改并确保测试通过
   ```bash
   pnpm test
   cd src-tauri && cargo test
   ```

3. 提交代码（使用规范的提交信息）
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

4. 推送到你的 Fork
   ```bash
   git push origin feat/your-feature-name
   ```

5. 在 GitHub 上创建 Pull Request

### PR 注意事项

- 标题使用 Conventional Commits 格式
- 说明改动的目的和内容
- 关联相关的 Issue（如有）
- 确保 CI 检查通过
- 保持 PR 范围聚焦，一个 PR 解决一个问题

## 提交 Issue

### Bug 报告

请包含以下信息：

- **环境信息**：macOS 版本、Mole GUI 版本
- **复现步骤**：清晰的操作步骤
- **期望行为**：你认为应该发生什么
- **实际行为**：实际发生了什么
- **截图**（如有帮助）

### 功能建议

- 说明你的使用场景
- 描述期望的功能
- 如果可能，说明对现有功能的影响

## 项目结构参考

```
mole-gui/
├── src-tauri/         # Tauri Rust 后端
│   └── src/
│       ├── mole/      # Mole CLI 命令封装
│       └── lib.rs     # 主入口
└── src/               # React 前端
    ├── components/    # 页面组件
    └── lib/           # 工具函数和 hooks
```

更多信息请参考：
- [README.md](./README.md) - 项目概览
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) - 更新日志
- [docs/superpowers/roadmap/next_phase_plan.md](./docs/superpowers/roadmap/next_phase_plan.md) - 后续规划

## License

提交即表示你同意你的贡献在 [MIT License](./LICENSE) 下发布。
