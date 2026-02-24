# Changelog

All notable changes to Nerve are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Bundled config consent prompt — all OpenClaw config modifications shown as one yes/no decision during setup (#15)
- Auto-patch `gateway.tools.allow` for OpenClaw ≥2026.2.23 cron tool access (#13)
- `INSTALLER-STEPS.md` documenting the full installer flow
- CHANGELOG.md

### Fixed
- Install redirect `nerve.zone/i` returning 404 (#14)
- Setup wizard help text showing 5 steps instead of 6
- `--defaults` mode missing origin patches for network installs
- Fresh install pre-pair regression (device scopes + pre-pair ordering)
- Custom bind IPs (e.g., `192.168.x.x`) incorrectly treated as local in defaults mode
- IPv6 loopback `::1` not recognized as local
- `approveAllPendingDevices` failing to parse JSON output from newer OpenClaw CLI
- Invalid `http://0.0.0.0:*` origins when IP detection fails

### Changed
- Setup wizard config changes now require explicit user consent (no more silent modifications)
- Single gateway restart after all config patches applied
- Extracted shared `applyConfigChanges()` helper (eliminates duplication between interactive/defaults flows)

### Compatibility
- OpenClaw ≥2026.2.19 (tested on 2.19 and 2.23)

## [1.1] — 2026-02-17

Initial public release as **Nerve**.

### Features
- React + Vite + Tailwind v4 + shadcn/ui web interface for OpenClaw
- Real-time chat with streaming responses
- Speech-to-text via Whisper (push-to-talk + wake word)
- Text-to-speech with OpenAI, Qwen, and Edge TTS providers
- 13 themes (Dracula, Nord, Solarized, Catppuccin, Tokyo Night, Gruvbox, One Dark, Monokai, Ayu Dark, Rosé Pine, Phosphor, Monochrome + default)
- Session management with subagent spawning and inline rename
- Git branch display in status bar
- Per-session effort/thinking level controls
- Model selector from gateway catalog
- HTTPS + WSS proxy support
- One-command installer (`nerve.zone/i`)
- systemd and launchd service management
- Local STT with whisper.node (tiny.en model)

### Compatibility
- OpenClaw ≥2026.2.9

[Unreleased]: https://github.com/daggerhashimoto/openclaw-nerve/compare/v1.1...HEAD
[1.1]: https://github.com/daggerhashimoto/openclaw-nerve/releases/tag/v1.1
