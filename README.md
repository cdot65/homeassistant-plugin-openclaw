# Home Assistant Skill for OpenClaw

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenClaw plugin for [Home Assistant](https://www.home-assistant.io/) — query states, call services, view history, fire events, and more via the HA REST API.

## Overview

Pure TypeScript plugin with direct Home Assistant REST API integration via `fetch()`.

**Provides:**
- **Gateway RPC**: `homeassistant.status`, `homeassistant.states`, `homeassistant.call_service`
- **16 Agent Tools**: Full coverage of the HA REST API (states, services, history, events, calendars, templates, etc.)
- **CLI Commands**: `openclaw homeassistant`, `openclaw ha-states`
- **Skill**: Agent instructions via `SKILL.md` for smart home control workflows

## Quick Start

### 1. Install

```bash
openclaw plugins install ./homeassistant-skill
```

### 2. Configure

Set environment variables for your Home Assistant instance:

```bash
export HA_BASE_URL="http://homeassistant.local:8123"
export HA_TOKEN="your-long-lived-access-token"
```

To create a long-lived access token in Home Assistant:
1. Go to your HA profile page (`/profile`)
2. Scroll to **Long-Lived Access Tokens**
3. Click **Create Token**

### 3. Restart Gateway

```bash
openclaw gateway restart
```

### 4. Verify

```bash
# Check status
openclaw homeassistant

# Get all entity states
openclaw ha-states

# Get a single entity
openclaw ha-states light.living_room

# Test via RPC
openclaw gateway call homeassistant.status
```

## Agent Tools

| Tool | Description |
|------|-------------|
| `ha_get_states` | Get all entity states |
| `ha_get_state` | Get single entity state |
| `ha_set_state` | Create/update entity state |
| `ha_call_service` | Call a service (control devices) |
| `ha_get_services` | List available services |
| `ha_get_history` | Get state change history |
| `ha_get_logbook` | Get logbook entries |
| `ha_fire_event` | Fire a custom event |
| `ha_get_events` | List event types |
| `ha_render_template` | Render Jinja2 template |
| `ha_get_calendars` | List calendars / get events |
| `ha_get_config` | Get HA server config |
| `ha_get_components` | List loaded components |
| `ha_get_error_log` | Get error log |
| `ha_check_config` | Validate configuration.yaml |
| `ha_handle_intent` | Handle a named intent |

## Plugin Structure

```
homeassistant-skill/
├── package.json
├── openclaw.plugin.json          # Plugin manifest
├── index.ts                      # Plugin entrypoint (RPC + tools + CLI)
├── src/
│   ├── types.ts                  # TypeScript interfaces for HA REST API
│   ├── client.ts                 # HTTP client wrapping HA REST API
│   └── client.test.ts            # Client unit tests (mocked fetch)
└── skills/homeassistant/
    └── SKILL.md                  # Agent instructions for smart home control
```

## Configuration

| Setting | Where |
|---------|-------|
| Base URL | Env var `HA_BASE_URL` or plugin config `base_url` |
| Access token | Env var `HA_TOKEN` or plugin config `token` |
| Timeout | Env var `HA_TIMEOUT_MS` (optional, default 10s) |

## Usage

### Gateway RPC

```bash
# Check connection status
openclaw gateway call homeassistant.status

# Get all states
openclaw gateway call homeassistant.states

# Get single entity
openclaw gateway call homeassistant.states --params '{"entity_id":"light.living_room"}'

# Call a service
openclaw gateway call homeassistant.call_service --params '{"domain":"light","service":"turn_on","data":{"entity_id":"light.living_room"}}'
```

### CLI

```bash
# Plugin status
openclaw homeassistant

# All entity states
openclaw ha-states

# Single entity (with attributes)
openclaw ha-states sensor.temperature

# JSON output
openclaw ha-states --json
```

## Development

Run from the `homeassistant-skill/` directory:

```bash
npm run check       # Full suite: typecheck + lint + format + test
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
npm run lint:fix    # ESLint with auto-fix
npm run format      # Prettier format
npm run test        # Run tests once
npm run test:watch  # Watch mode
```

## Requirements

- Node.js 18+
- Home Assistant instance with REST API access
- Long-lived access token

## Links

- [Home Assistant REST API docs](https://developers.home-assistant.io/docs/api/rest/)
- [Home Assistant](https://www.home-assistant.io/)

## License

MIT
