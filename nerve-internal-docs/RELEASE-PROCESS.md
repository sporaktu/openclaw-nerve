# Release Process

How we version, tag, and ship Nerve releases.

## Distribution Model

Nerve is distributed via **git clone from master**, not npm registry. The installer (`nerve.zone/i`) clones `--branch master` by default. This means every merge to master is effectively a release.

## Versioning

We use **semver** (`MAJOR.MINOR.PATCH`) in `package.json`:

- **Patch** (`1.3.1`): Bug fixes, config tweaks, docs updates. No new features, no breaking changes.
- **Minor** (`1.4.0`): New features, non-breaking improvements. Users should update but nothing breaks if they don't immediately.
- **Major** (`2.0.0`): Breaking changes — config format changes, dropped OpenClaw version support, removed features, API changes.

### OpenClaw Compatibility

Each Nerve release targets a minimum OpenClaw version. Document this in the changelog and README. When a Nerve feature requires a newer OpenClaw version (e.g., `gateway.tools.allow` needs ≥2026.2.23), that's a **minor** bump, not major — the feature gracefully degrades on older versions.

## Release Checklist

### Before merging

1. All PRs go through branch → review → squash merge to master
2. CI passes (lint + build)
3. Code review completed

### Cutting a release

When master has accumulated meaningful changes (or one significant feature lands):

1. **Bump version** in `package.json`
2. **Update CHANGELOG.md** — add new version section at the top
3. **Commit**: `chore: bump version to X.Y.Z`
4. **Tag**: `git tag vX.Y.Z`
5. **Push**: `git push origin master --tags`
6. **GitHub Release**: Create from the tag with changelog excerpt

### When to cut a release

- After every significant feature merge (realtime streaming, new UI panel, etc.)
- After security fixes (immediate)
- Batched bug fixes — accumulate 3-5 small fixes, then release
- Don't release for docs-only or CI-only changes (no version bump needed)

## Git Tags

Tags follow the format `vX.Y.Z` (e.g., `v1.3.0`, `v1.4.0`).

Existing tags:
- `v1.1.0` — Release versioning in status bar
- `v1.1.1` — Patch release
- `v1.2.0` — Code quality overhaul (CSS consolidation, lint fixes, memoization)
- `v1.3.0` — Open-source readiness (security, Qwen TTS rewrite, themes, session management)

## GitHub Releases

Create a GitHub Release for each tag. Include:
- Summary of what changed (user-facing language, not commit messages)
- OpenClaw compatibility note
- Any migration steps if applicable
- Link to full changelog diff

## Branch Strategy

- **`master`** — production, always deployable
- **Feature branches** — `feat/description`, `fix/description`
- **No release branches** — overkill for this project size
- **No develop branch** — master + feature branches is sufficient

PRs are squash-merged to keep master history clean.

## What We Don't Do

- **npm publish** — users don't `npm install -g openclaw-nerve`
- **CalVer** — semver communicates breaking changes better for a UI project
- **Automated version bumps** — manual bump gives us control over what constitutes a release
- **Release branches** — single master branch with tags is sufficient

## Installer Compatibility

The installer (`install.sh`) clones master by default but supports `--branch <name>`. Users can pin to a specific tag:

```bash
curl -fsSL nerve.zone/i | bash -s -- --branch v1.3.0
```

This gives users a rollback path if a new release breaks something.
