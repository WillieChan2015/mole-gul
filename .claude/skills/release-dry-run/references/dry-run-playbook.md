# mole-gui Release Dry Run Playbook

This playbook guides you through previewing a mole-gui release without modifying the repository.

## Dry Run Objectives

1. **Preview version changes** - What version will be released?
2. **Preview changelog migration** - How will `Unreleased` be updated?
3. **Preview git operations** - What commit and tag will be created?
4. **Preview GitHub Release** - What will the release notes contain?
5. **Identify blockers** - What prevents the release from proceeding?

## Step-by-Step Dry Run

### 1. Gather Current State

```bash
# Current version
grep '"version"' package.json
grep 'version' src-tauri/tauri.conf.json

# Recent tags
git tag --sort=-creatordate | head -5

# Git status
git status --short

# Current branch
git branch --show-current
```

### 2. Analyze Changelog

```bash
# View CHANGELOG.md
cat CHANGELOG.md

# Check if Unreleased has content
grep -A 50 "## \[Unreleased\]" CHANGELOG.md | head -60

# Check if target version exists
grep "## \[0.4.0\]" CHANGELOG.md
```

### 3. Determine Target Version

Based on user input:
- **Explicit version**: Use directly (e.g., `0.4.0`)
- **Semantic bump**: Calculate from current version
  - `patch`: 0.3.0 → 0.3.1
  - `minor`: 0.3.0 → 0.4.0
  - `major`: 0.3.0 → 1.0.0

### 4. Preview Changelog Migration

**Scenario A: Target version section exists**
- Release will reuse existing section
- No migration needed

**Scenario B: Target version section doesn't exist, Unreleased has content**
- Release will promote `Unreleased` to `## [X.Y.Z] - YYYY-MM-DD`
- New `Unreleased` template will be created

**Scenario C: Unreleased is empty (template only)**
- Release will be blocked
- User must run `/changelog-generator` first

### 5. Preview Git Operations

```bash
# Preview commit message
echo "chore: release vX.Y.Z"

# Preview tag
echo "vX.Y.Z"

# Preview tag message
echo "Release vX.Y.Z"
```

### 6. Preview GitHub Release

**Release Notes Source**:
- If target version section exists: Use that section
- If promoting from Unreleased: Use the promoted content

**Build Artifacts**:
- macOS ARM64: `Mole GUI_aarch64.dmg`
- macOS x86_64: `Mole GUI_x64.dmg`

### 7. Check for Blockers

**Version Blockers**:
- [ ] Version mismatch between `package.json` and `src-tauri/tauri.conf.json`
- [ ] Target tag already exists
- [ ] Invalid version format

**Changelog Blockers**:
- [ ] Unreleased is empty (template only)
- [ ] Target version section already exists (if not intentional)

**Git Blockers**:
- [ ] Working directory is dirty
- [ ] Uncommitted changes
- [ ] Not on main/master branch

**Test Blockers**:
- [ ] Frontend tests fail
- [ ] Backend tests fail
- [ ] Build fails

**Security Blockers**:
- [ ] Sensitive data found in source code
- [ ] API keys or tokens exposed

## Dry Run Output Template

```
## Release Dry Run Summary

### Version Information
- **Current version**: X.Y.Z
- **Target version**: X.Y.Z
- **Target tag**: vX.Y.Z

### Changelog Status
- **Unreleased content**: ✅ Has entries / ❌ Empty (template only)
- **Target version section**: ✅ Exists (will reuse) / ⚠️ Will be created
- **Migration plan**: [Describe what will happen]

### Git Operations
- **Commit message**: `chore: release vX.Y.Z`
- **Tag**: `vX.Y.Z`
- **Tag message**: `Release vX.Y.Z`

### GitHub Release
- **Release notes source**: [Unreleased promotion / Existing section]
- **Build artifacts**: 
  - macOS ARM64: `Mole GUI_aarch64.dmg`
  - macOS x86_64: `Mole GUI_x64.dmg`

### Blockers
- [List any blockers, or "None"]

### Risk Assessment
- **Low risk**: [List low risk items]
- **Medium risk**: [List medium risk items]
- **High risk**: [List high risk items]

### Recommendation
- ✅ **Ready to proceed**: Run `/release` to execute the release
- ⚠️ **Caution**: [Describe caution items]
- ❌ **Blocked**: [Describe blockers and how to resolve them]

### Next Steps
1. [If ready]: Run `/release` to execute the release
2. [If blocked]: Resolve blockers and re-run dry-run
3. [If caution]: Review caution items and decide
```

## Example Dry Run Scenarios

### Scenario 1: Patch Release (0.3.0 → 0.3.1)

```
Current version: 0.3.0
Target version: 0.3.1
Target tag: v0.3.1

Changelog: Unreleased has 3 entries (2 Added, 1 Fixed)
Migration: Unreleased will be promoted to ## [0.3.1] - 2026-06-12

Blockers: None
Status: Ready to proceed
```

### Scenario 2: Minor Release (0.3.0 → 0.4.0)

```
Current version: 0.3.0
Target version: 0.4.0
Target tag: v0.4.0

Changelog: Unreleased has 10 entries (5 Added, 3 Changed, 2 Fixed)
Migration: Unreleased will be promoted to ## [0.4.0] - 2026-06-12

Blockers: None
Status: Ready to proceed
```

### Scenario 3: Blocked Release

```
Current version: 0.3.0
Target version: 0.4.0
Target tag: v0.4.0

Changelog: Unreleased is empty (template only)
Migration: BLOCKED - Unreleased has no content

Blockers: 
- Unreleased is empty (run /changelog-generator first)

Status: Blocked - resolve blockers first
```

## Dry Run Checklist

Before concluding the dry run, verify:

- [ ] Target version is clearly stated
- [ ] Changelog migration plan is explained
- [ ] Git operations are previewed
- [ ] GitHub Release content is described
- [ ] All blockers are identified
- [ ] Risk assessment is provided
- [ ] Next steps are clear

## Common Issues and Resolutions

### Issue: Version Mismatch
**Resolution**: Update both `package.json` and `src-tauri/tauri.conf.json` to the same version

### Issue: Empty Unreleased
**Resolution**: Run `/changelog-generator` to populate changelog entries

### Issue: Tag Already Exists
**Resolution**: Choose a different version number or delete the existing tag (if appropriate)

### Issue: Dirty Working Directory
**Resolution**: Commit or stash changes before proceeding

### Issue: Tests Failing
**Resolution**: Fix failing tests before proceeding

## Integration with Other Skills

- **`/changelog-generator`**: Use to populate empty Unreleased section
- **`/release-audit`**: Use for detailed readiness checklist
- **`/release`**: Use to execute the actual release

## Dry Run Commands

These commands can be run during dry run (read-only):

```bash
# Version inspection
cat package.json | grep version
cat src-tauri/tauri.conf.json | grep version

# Changelog inspection
cat CHANGELOG.md
grep -A 50 "## \[Unreleased\]" CHANGELOG.md

# Git inspection
git status --short
git tag --list
git log --oneline -10

# Test commands
pnpm test
cd src-tauri && cargo test

# Linting
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo fmt -- --check
```

## Conclusion

A successful dry run should provide:
1. Clear understanding of what will happen
2. Confidence that the release is ready
3. Awareness of any risks or blockers
4. Clear next steps to proceed

If the dry run reveals blockers, resolve them before proceeding to `/release`.
