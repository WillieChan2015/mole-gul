# mole-gui Project Release Files

This document lists the key files involved in the mole-gui release process.

## Core Files

### Version Files
- **`package.json`** - Frontend version and dependencies
- **`src-tauri/tauri.conf.json`** - Tauri app configuration and version

### Changelog
- **`CHANGELOG.md`** - Keep a Changelog format, GitHub Release source

### Build Configuration
- **`src-tauri/Cargo.toml`** - Rust dependencies and build configuration
- **`vite.config.ts`** - Frontend build configuration
- **`tailwind.config.js`** - Tailwind CSS configuration

## GitHub Actions

### Release Workflow
- **`.github/workflows/release.yml`** - Main release workflow
  - Triggered by `v*` tags
  - Builds macOS ARM64 and x86_64 versions
  - Creates GitHub Release
  - Uploads .dmg files

### CI Workflow
- **`.github/workflows/ci.yml`** - Continuous Integration
  - Runs on push to main/master and PRs
  - Frontend tests (TypeScript + Vitest)
  - Backend tests (Rust + Clippy)
  - macOS build verification

## Source Code Structure

### Frontend (React + TypeScript)
- **`src/`** - Frontend source code
  - `components/` - React components
  - `lib/` - Utility functions and hooks
  - `i18n/` - Internationalization files

### Backend (Rust + Tauri)
- **`src-tauri/src/`** - Rust source code
  - `mole/` - Mole CLI integration
  - `clean.rs` - Clean module
  - `analyze.rs` - Analyze module
  - `optimize.rs` - Optimize module
  - `uninstall.rs` - Uninstall module
  - `history.rs` - History module
  - `purge.rs` - Purge module

## Build Commands

### Development
```bash
pnpm tauri dev  # Start development server
```

### Testing
```bash
pnpm test                    # Frontend tests
cd src-tauri && cargo test   # Backend tests
```

### Building
```bash
pnpm build                   # Frontend build (tsc && vite build)
pnpm tauri build             # Full Tauri build (creates .dmg)
```

### Linting
```bash
cd src-tauri && cargo clippy -- -D warnings  # Rust linting
cd src-tauri && cargo fmt -- --check          # Rust formatting
```

## Release Checklist

Before releasing, ensure:

1. **Version Alignment**
   - `package.json` version matches `src-tauri/tauri.conf.json` version
   - Git tag matches both versions

2. **Changelog**
   - `CHANGELOG.md` has entries for the new version
   - `## [Unreleased]` section exists and is populated

3. **Tests Pass**
   - `pnpm test` passes
   - `cd src-tauri && cargo test` passes

4. **Build Succeeds**
   - `pnpm build` succeeds
   - No TypeScript errors

5. **Code Quality**
   - `cd src-tauri && cargo clippy -- -D warnings` passes
   - `cd src-tauri && cargo fmt -- --check` passes

6. **No Sensitive Data**
   - No hardcoded API keys or secrets
   - No private keys or tokens

## Environment Variables

### GitHub Actions
- **`GITHUB_TOKEN`** - Automatically provided by GitHub Actions

### Optional (macOS Signing)
- **`APPLE_CERTIFICATE`** - Apple developer certificate
- **`APPLE_CERTIFICATE_PASSWORD`** - Certificate password
- **`APPLE_SIGNING_IDENTITY`** - Signing identity
- **`APPLE_ID`** - Apple ID
- **`APPLE_PASSWORD`** - App-specific password
- **`APPLE_TEAM_ID`** - Apple developer team ID

## Build Artifacts

### macOS
- **ARM64 (Apple Silicon)**: `Mole GUI_aarch64.dmg`
- **x86_64 (Intel)**: `Mole GUI_x64.dmg`

### File Locations
- CI workflow: GitHub Actions -> Artifacts
- Release workflow: GitHub Releases -> Assets

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Tauri Build Documentation](https://tauri.app/v1/guides/building/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
