# mole-gui Release Readiness Checklist

This checklist helps verify that a mole-gui release is ready to proceed.

## Version Alignment

- [ ] `package.json` version matches target version
- [ ] `src-tauri/tauri.conf.json` version matches target version
- [ ] Both versions are consistent with each other
- [ ] Git tag does not already exist for target version

## Changelog Status

- [ ] `CHANGELOG.md` exists
- [ ] `## [Unreleased]` section exists
- [ ] `Unreleased` has real entries (not just template headers)
- [ ] Target version section does not already exist (or is intentionally reusing)
- [ ] All entries are in bilingual format (Chinese + English)

## Git Status

- [ ] Working directory is clean (no uncommitted changes)
- [ ] No untracked files that should be committed
- [ ] Current branch is main/master
- [ ] Local branch is up to date with remote

## Test Status

- [ ] Frontend tests pass (`pnpm test`)
- [ ] Backend tests pass (`cd src-tauri && cargo test`)
- [ ] TypeScript type check passes (`pnpm build`)

## Code Quality

- [ ] Rust clippy passes (`cd src-tauri && cargo clippy -- -D warnings`)
- [ ] Rust formatting is correct (`cd src-tauri && cargo fmt -- --check`)
- [ ] No linting errors

## Security Check

- [ ] No hardcoded API keys in source code
- [ ] No private keys or tokens in source code
- [ ] No sensitive data in configuration files
- [ ] No `.env` files in version control

## Build Configuration

- [ ] GitHub Actions workflow exists (`.github/workflows/release.yml`)
- [ ] Workflow triggers on `v*` tags
- [ ] Workflow builds for macOS ARM64 and x86_64
- [ ] Workflow creates GitHub Release
- [ ] Workflow uploads .dmg files

## Documentation

- [ ] README.md is up to date
- [ ] CHANGELOG.md format is correct
- [ ] Version numbers are consistent across all files

## Allowed Commands (Read-Only)

These commands can be run during audit without modifying the repository:

```bash
# Version checks
cat package.json | grep version
cat src-tauri/tauri.conf.json | grep version

# Git status
git status --short
git tag --list
git log --oneline -5

# Test commands
pnpm test
cd src-tauri && cargo test

# Linting
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo fmt -- --check

# File inspection
cat CHANGELOG.md
cat .github/workflows/release.yml
```

## Blocked Commands (Read-Only Boundary)

These commands should NOT be run during audit:

```bash
# Build commands (write to disk)
pnpm build
cargo build
pnpm tauri build

# Git modifications
git commit
git tag
git push

# Package management
npm publish
pnpm publish
```

## Common Blockers

### Version Mismatch
- **Problem**: `package.json` and `src-tauri/tauri.conf.json` versions don't match
- **Fix**: Update both files to the same version

### Empty Unreleased
- **Problem**: `CHANGELOG.md` `## [Unreleased]` has only template headers
- **Fix**: Run `/changelog-generator` to populate entries

### Tag Already Exists
- **Problem**: Git tag for target version already exists
- **Fix**: Choose a different version number or delete the existing tag

### Tests Failing
- **Problem**: Frontend or backend tests fail
- **Fix**: Fix the failing tests before proceeding

### Linting Errors
- **Problem**: Rust clippy or formatting issues
- **Fix**: Run `cargo clippy --fix` and `cargo fmt`

### Sensitive Data
- **Problem**: API keys, tokens, or secrets in source code
- **Fix**: Remove sensitive data and rotate credentials

## Audit Output Format

When presenting audit results, use this format:

```
## Release Audit Summary

### Version
- Current: X.Y.Z
- Target: X.Y.Z
- Status: ✅ Aligned / ❌ Mismatch

### Changelog
- Unreleased: ✅ Has entries / ❌ Empty (template only)
- Target version: ✅ Ready / ⚠️ Already exists / ❌ Missing

### Git Status
- Working directory: ✅ Clean / ❌ Dirty
- Tag: ✅ Available / ❌ Already exists

### Tests
- Frontend: ✅ Pass / ❌ Fail
- Backend: ✅ Pass / ❌ Fail

### Code Quality
- Clippy: ✅ Pass / ❌ Fail
- Formatting: ✅ Pass / ❌ Fail

### Security
- Sensitive data: ✅ None found / ❌ Found

### Blockers
- [List any blockers]

### Recommendation
- ✅ Ready to proceed to /release
- ❌ Blockers must be resolved first
```

## Next Steps

If audit passes:
1. Switch to `/release` skill
2. Follow the release workflow
3. Push tag to trigger GitHub Actions

If audit fails:
1. Address each blocker
2. Re-run audit
3. Proceed when all checks pass
