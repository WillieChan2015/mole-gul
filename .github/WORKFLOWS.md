# GitHub Actions 工作流说明

本项目配置了两个 GitHub Actions 工作流：

## 1. CI 工作流 (`.github/workflows/ci.yml`)

### 触发条件
- 推送到 `main` 或 `master` 分支
- Pull Request 到 `main` 或 `master` 分支

### 执行任务

#### 前端测试 (test-frontend)
- 安装 pnpm 和 Node.js
- 安装前端依赖
- 运行 TypeScript 类型检查
- 运行前端测试

#### 后端测试 (test-backend)
- 安装 Rust 工具链
- 安装系统依赖
- 运行 Rust 测试
- 运行 Clippy 静态检查
- 检查代码格式

#### macOS 构建 (build-macos)
- 依赖前端和后端测试通过
- 构建 Tauri 应用
- 上传构建产物（保留 7 天）

## 2. Release 工作流 (`.github/workflows/release.yml`)

### 触发条件
- 推送标签（格式：`v*`，如 `v1.0.0`）
- 手动触发（workflow_dispatch）

### 执行任务

#### 多平台构建
- macOS ARM64 (Apple Silicon)
- macOS x86_64 (Intel)

#### 发布流程
1. 构建 Tauri 应用
2. 创建 GitHub Release（Draft）
3. 上传构建产物（.dmg 文件）
4. 自动生成 Release Notes

## 使用方法

### 开发流程

1. **创建功能分支**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **开发并提交**
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

3. **推送并创建 PR**
   ```bash
   git push origin feature/my-feature
   ```
   然后在 GitHub 上创建 Pull Request

4. **CI 自动运行**
   - PR 创建后会自动运行 CI 工作流
   - 包括前端测试、后端测试和 macOS 构建

5. **合并 PR**
   - 测试通过后，可以合并到 main/master 分支

### 发布流程

1. **更新版本号**
   - 在 `package.json` 中更新版本号
   - 在 `src-tauri/tauri.conf.json` 中更新版本号

2. **提交版本更新**
   ```bash
   git add .
   git commit -m "chore: bump version to v1.0.0"
   ```

3. **创建标签**
   ```bash
   git tag v1.0.0
   ```

4. **推送标签**
   ```bash
   git push origin v1.0.0
   ```

5. **自动发布**
   - 标签推送后会自动触发 Release 工作流
   - 构建 macOS ARM64 和 x86_64 版本
   - 创建 GitHub Release（Draft）
   - 上传 .dmg 文件

6. **完成发布**
   - 在 GitHub 上编辑 Release
   - 添加 Release Notes
   - 发布 Release

## 环境变量和密钥

### 自动配置
- `GITHUB_TOKEN`: GitHub Actions 自动提供，用于创建 Release 和上传产物

### 可选配置
如果需要签名或公证 macOS 应用，需要添加以下密钥：
- `APPLE_CERTIFICATE`: Apple 开发者证书
- `APPLE_CERTIFICATE_PASSWORD`: 证书密码
- `APPLE_SIGNING_IDENTITY`: 签名身份
- `APPLE_ID`: Apple ID
- `APPLE_PASSWORD`: App 专用密码
- `APPLE_TEAM_ID`: Apple 开发者团队 ID

## 构建产物

### macOS
- **ARM64 版本**: `Mole GUI_aarch64.dmg`
- **x86_64 版本**: `Mole GUI_x64.dmg`

### 文件位置
构建产物会上传到：
- CI 工作流: Actions -> Artifacts
- Release 工作流: Releases -> Assets

## 故障排除

### CI 失败

1. **前端测试失败**
   - 检查 TypeScript 类型错误
   - 运行 `pnpm test` 本地复现

2. **后端测试失败**
   - 检查 Rust 编译错误
   - 运行 `cd src-tauri && cargo test` 本地复现

3. **构建失败**
   - 检查依赖安装
   - 查看构建日志

### Release 失败

1. **标签格式错误**
   - 确保标签格式为 `v*`（如 `v1.0.0`）

2. **构建失败**
   - 检查 CI 是否通过
   - 查看 Release 工作流日志

3. **上传失败**
   - 检查 GitHub Token 权限
   - 确保 Release 已创建

## 最佳实践

1. **版本管理**
   - 使用语义化版本（Semantic Versioning）
   - 格式：`v主版本.次版本.修订版本`

2. **提交规范**
   - 使用 Conventional Commits 格式
   - 示例：`feat: 添加新功能`、`fix: 修复 bug`

3. **分支策略**
   - `main/master`: 稳定版本
   - `feature/*`: 功能分支
   - `hotfix/*`: 紧急修复分支

4. **发布节奏**
   - 定期发布新版本
   - 及时修复已知问题
   - 保持向后兼容性

## 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Tauri 构建文档](https://tauri.app/v1/guides/building/)
- [语义化版本](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
