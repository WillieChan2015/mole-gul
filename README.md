# Mole GUI

为 [Mole](https://github.com/tw93/Mole)（macOS 终端系统维护工具）构建的原生 macOS GUI 应用。

## 技术栈

**Tauri v2**（Rust 后端 + React 前端）

## 安装

### 下载预构建版本

前往 [GitHub Releases](https://github.com/WillieChan2015/mole-gui/releases) 下载最新 `.dmg` 文件，双击安装即可。

> 首次打开可能提示"无法验证开发者"，前往 **系统设置 > 隐私与安全性** 中点击"仍要打开"。

### 从源码构建

**前置依赖：**

- **macOS**（仅支持 macOS）
- [Rust](https://www.rust-lang.org/tools/install)（stable）
- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)
- Xcode Command Line Tools

**构建步骤：**

```bash
# 克隆项目（含 submodule）
git clone --recursive https://github.com/WillieChan2015/mole-gui.git
cd mole-gui

# 如果已 clone 但没加 --recursive
git submodule update --init --recursive

# 安装依赖
pnpm install

# 开发模式
pnpm tauri dev

# 生产构建（输出 .dmg）
pnpm tauri build
```

## 使用说明

### Dashboard（仪表盘）

启动后首屏显示系统概况：CPU/内存/磁盘使用率、系统信息。

### Clean（系统清理）

- 支持**选择性清理**：通过勾选框选择要清理的项目
- **实时进度显示**：扫描过程中实时显示进度
- 安全删除：可选择移至废纸篓而非永久删除

### Analyze（磁盘分析）

指定路径进行磁盘空间分析，以可视化方式展示各目录占用情况。

### 其他功能

| 功能 | 说明 |
|------|------|
| **Uninstall** | 应用卸载，支持批量选择 |
| **Optimize** | 系统优化（DNS、字体缓存等） |
| **Purge** | 项目依赖清理（node_modules、target 等） |
| **Installer** | 安装包清理（扫描 Downloads/Documents） |
| **History** | 操作历史记录查看 |

## 项目结构

```
mole-gui/
├── mole-src/          # git submodule → tw93/Mole
├── src-tauri/         # Tauri Rust 后端
│   └── src/
│       ├── mole/      # Mole CLI 命令封装
│       └── sysinfo.rs # 系统信息采集
└── src/               # React 前端
    ├── components/
    │   ├── Dashboard/  # 首页仪表盘
    │   ├── Clean/      # 系统清理
    │   ├── Analyze/    # 磁盘分析
    │   ├── Uninstall/  # 应用卸载
    │   ├── Optimize/   # 系统优化
    │   ├── Purge/      # 项目清理
    │   ├── Installer/  # 安装包清理
    │   └── History/    # 操作历史
    └── lib/
        ├── invoke.ts           # Tauri invoke 封装
        └── useMoleCommand.ts   # 通用异步命令 hook
```

## 更新 Mole

```bash
cd mole-src && git pull origin main && cd ..
# 测试通过后提交新的 submodule 指针
git add mole-src && git commit -m "chore: update Mole to latest"
```

## 贡献

欢迎贡献！请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发环境搭建、代码规范和 PR 流程。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feat/your-feature`)
3. 提交改动（遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范）
4. 推送并创建 Pull Request

## License

本项目基于 [MIT License](./LICENSE) 开源。

## 相关文档

- [文档索引](./docs/DOCS_INDEX.md)
- [更新日志](./docs/CHANGELOG.md)
- [Mole 上游仓库](https://github.com/tw93/Mole)
