# Mole GUI 文档索引

本文件索引项目中所有相关需求、计划和文档的位置。

## 文档结构

```
mole-gui/
├── README.md                    # 项目介绍和快速开始（根目录）
├── docs/                        # 文档目录
│   ├── DOCS_INDEX.md            # 文档索引（本文件）
│   ├── CHANGELOG.md             # 版本历史和重要变更
│   └── superpowers/             # 开发过程文档
│       ├── architecture/        # 架构设计文档
│       │   └── implementation_plan.md
│       ├── roadmap/             # 路线图和规划
│       │   └── next_phase_plan.md
│       ├── compliance/          # 合规和标准
│       │   └── open_source_checklist.md
│       └── testing/             # 测试和验证
│           └── phase0_results.md
├── src-tauri/                   # Rust 后端
└── src/                         # React 前端
```

---

## 文档详细说明

### 1. README.md
**位置**：`../README.md`（根目录）
**用途**：项目介绍、快速开始、技术栈说明
**内容**：
- 项目简介
- 技术栈（Tauri v2）
- 安装和构建指南
- 使用说明
- 项目结构
- 更新 Mole 方法
- 相关文档链接

**更新频率**：重大变更时更新

---

### 2. CHANGELOG.md
**位置**：`./CHANGELOG.md`（docs/目录）
**用途**：版本历史和重要变更
**内容**：
- [0.1.0] - 2024-06-10
  - Phase 0：可行性验证 ✅
  - Phase 1：项目脚手架 + Mole 集成 ✅
  - Phase 2：核心模块 ✅
  - Phase 3：扩展模块 ✅
  - Phase 4：打磨 ✅
  - 技术细节
  - 已知问题
  - 下一阶段
- [0.0.1] - 2024-06-04
  - 项目初始化

**更新频率**：每次发布时更新

---

### 3. implementation_plan.md
**位置**：`./superpowers/architecture/implementation_plan.md`
**用途**：详细实施方案和架构设计
**内容**：
- Context（项目背景）
- 技术选型（Tauri v2）
- Mole 集成方式（git submodule）
- 项目结构
- 架构设计（数据流、关键决策）
- 各模块 CLI → GUI 映射
- 前端异步状态管理
- 安全设计
- 错误处理与进程管理
- 实施步骤（Phase 0-4）
- Phase 0 验证后剩余风险
- 验证方式

**更新频率**：实施过程中更新

---

### 4. next_phase_plan.md
**位置**：`./superpowers/roadmap/next_phase_plan.md`
**用途**：下一阶段规划和任务清单
**内容**：
- 当前状态（Phase 0-4 完成）
- 已完成功能
- 已知待办
- 下一阶段规划（5个优先级）
  - 优先级1：测试和质量保证（2-3天）
  - 优先级2：CI/CD和发布准备（1-2天）
  - 优先级3：功能增强（3-5天）
  - 优先级4：文档和用户体验（1-2天）
  - 优先级5：性能优化（2-3天）
- 执行计划
- 立即可执行任务

**更新频率**：每个阶段结束后更新

---

### 5. phase0_results.md
**位置**：`./superpowers/testing/phase0_results.md`
**用途**：Phase 0 验证结果详细记录
**内容**：
- 验证目标
- 验证环境
- 验证结果（8/8 通过）
  1. subprocess 基本调用 ✅
  2. `NO_COLOR=1` 禁用 ANSI ✅
  3. `history --json` ✅
  4. `uninstall --list` JSON ✅
  5. `clean` dry-run 文本解析 ✅
  6. `optimize` dry-run 文本解析 ✅
  7. `purge` dry-run 汇总解析 ✅
  8. subprocess 超时 kill ✅
- 关键发现
- 验证结论

**更新频率**：一次性记录

---

### 6. open_source_checklist.md
**位置**：`./superpowers/compliance/open_source_checklist.md`
**用途**：开源项目标准检查清单
**内容**：
- 当前状态评估（总体符合度：约60%）
- 已符合的标准（项目结构、测试覆盖、CI/CD配置、文档）
- 缺失的标准（必需文件、README内容、元数据、代码质量工具、CI/CD功能、应用资源）
- 改进计划（4个优先级，总计4天）
- 完成时间估计
- 注意事项
- 参考资源

**更新频率**：定期更新（完成改进任务后更新状态）

---

## 需求和计划追踪

### 已完成需求

| 需求 | 状态 | 文档位置 |
|------|------|----------|
| 可行性验证 | ✅ | superpowers/testing/phase0_results.md |
| 项目脚手架 | ✅ | superpowers/architecture/implementation_plan.md |
| Mole 集成 | ✅ | superpowers/architecture/implementation_plan.md |
| Dashboard | ✅ | superpowers/architecture/implementation_plan.md |
| Clean | ✅ | superpowers/architecture/implementation_plan.md |
| Analyze | ✅ | superpowers/architecture/implementation_plan.md |
| Uninstall | ✅ | superpowers/architecture/implementation_plan.md |
| Optimize | ✅ | superpowers/architecture/implementation_plan.md |
| Purge | ✅ | superpowers/architecture/implementation_plan.md |
| Installer | ✅ | superpowers/architecture/implementation_plan.md |
| History | ✅ | superpowers/architecture/implementation_plan.md |
| 毛玻璃侧边栏 | ✅ | superpowers/architecture/implementation_plan.md |
| 暗色模式 | ✅ | superpowers/architecture/implementation_plan.md |
| 通知功能 | ✅ | superpowers/architecture/implementation_plan.md |
| 自动更新 | ✅ | superpowers/architecture/implementation_plan.md |

### 待办需求

| 需求 | 优先级 | 文档位置 |
|------|--------|----------|
| 测试和质量保证 | 🥇 1 | superpowers/roadmap/next_phase_plan.md |
| CI/CD和发布准备 | 🥈 2 | superpowers/roadmap/next_phase_plan.md |
| 功能增强 | 🥉 3 | superpowers/roadmap/next_phase_plan.md |
| 文档和用户体验 | 4️⃣ 4 | superpowers/roadmap/next_phase_plan.md |
| 性能优化 | 5️⃣ 5 | superpowers/roadmap/next_phase_plan.md |

---

## 文档维护指南

### 更新原则

1. **README.md**：重大变更时更新（如新功能、架构调整）
2. **CHANGELOG.md**：每次发布时更新（如版本号、变更记录）
3. **implementation_plan.md**：实施过程中更新（如设计决策变更）
4. **next_phase_plan.md**：每个阶段结束后更新（如任务完成、新任务添加）
5. **phase0_results.md**：一次性记录，不再更新

### 更新流程

1. **开始新阶段前**
   - 更新 next_phase_plan.md（添加新任务）
   - 更新 README.md（更新当前状态）

2. **阶段进行中**
   - 更新 implementation_plan.md（记录设计决策）
   - 更新 CHANGELOG.md（记录重要变更）

3. **阶段结束后**
   - 更新 next_phase_plan.md（标记完成任务）
   - 更新 CHANGELOG.md（记录版本发布）
   - 更新 README.md（更新当前状态）

---

## 相关链接

- **Mole 上游仓库**：https://github.com/tw93/Mole
- **Tauri 官方文档**：https://tauri.app/v2/
- **React 官方文档**：https://react.dev/
- **Rust 官方文档**：https://doc.rust-lang.org/

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | 2024-06-10 | Phase 0-4 完成 |
| 0.0.1 | 2024-06-04 | 项目初始化 |

---

## 联系方式

- **项目维护者**：Willie
- **GitHub**：https://github.com/WillieChan2015/mole-gui

---

**最后更新**：2024-06-11
