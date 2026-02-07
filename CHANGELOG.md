# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-07

### Added

- Initial release as OpenClaw plugin for Home Assistant
- Pure TypeScript HTTP client wrapping the HA REST API via `fetch()`
- Gateway RPC methods: `homeassistant.status`, `homeassistant.states`, `homeassistant.call_service`
- 16 agent tools covering states, services, history, events, calendars, templates, config, and intents
- CLI commands: `openclaw homeassistant` (status), `openclaw ha-states` (entity states)
- Skill with agent instructions for smart home control workflows (`SKILL.md`)
- TypeScript interfaces for all HA REST API types
- Vitest test suite with mocked fetch
- ESLint 9 + Prettier + TypeScript strict mode
