# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests
cd homeassistant-plugin && npm test

# Run tests in watch mode
cd homeassistant-plugin && npm run test:watch

# Full check suite (typecheck + lint + format + test)
cd homeassistant-plugin && npm run check

# Install plugin to OpenClaw
npm install @cdot65/homeassistant
# Or from local path
openclaw plugins install ./homeassistant-plugin

# Check status via CLI
openclaw homeassistant

# Get states via CLI
openclaw ha-states [entity_id]

# Test via RPC
openclaw gateway call homeassistant.status
openclaw gateway call homeassistant.states --params '{"entity_id":"light.living_room"}'
openclaw gateway call homeassistant.call_service --params '{"domain":"light","service":"turn_on","data":{"entity_id":"light.living_room"}}'
```

## Architecture

OpenClaw **plugin + skill** wrapping the Home Assistant REST API in pure TypeScript.

**Components:**
- `homeassistant-plugin/src/types.ts` - TypeScript interfaces for all HA REST API types
- `homeassistant-plugin/src/client.ts` - HTTP client with direct `fetch()` to HA REST API
- `homeassistant-plugin/index.ts` - Plugin entrypoint (RPC methods + agent tools + CLI)
- `homeassistant-plugin/skills/homeassistant/SKILL.md` - Skill instructions for the agent
- `homeassistant-plugin/openclaw.plugin.json` - Plugin manifest (ships the skill)

**Data flow:**
```
Agent → SKILL.md instructions → ha_* tools → client.ts → fetch() → HA REST API
  or
Agent → Gateway RPC → homeassistant.* methods → client.ts → fetch() → HA REST API
  or
User → CLI (openclaw homeassistant) → client.ts → fetch() → HA REST API
```

**Key types:**
- `HAConfig`: baseUrl, token, timeoutMs
- `HAClientResult<T>`: ok, status, data, latencyMs, error
- `EntityState`: entity_id, state, attributes, last_changed, last_updated

## Config

| Setting | Where to Configure |
|---------|-------------------|
| Base URL | Env var `HA_BASE_URL` |
| Access token | Env var `HA_TOKEN` |
| Timeout | Env var `HA_TIMEOUT_MS` (optional, default 10s) |

## Home Assistant REST API

**Base URL:** `http://<HA_IP>:8123/api/`

**Auth header:** `Authorization: Bearer <token>`

**Key endpoints:**
- `GET /api/` — API status
- `GET /api/config` — Server configuration
- `GET /api/states` — All entity states
- `GET /api/states/<entity_id>` — Single entity state
- `POST /api/states/<entity_id>` — Create/update state
- `DELETE /api/states/<entity_id>` — Delete entity
- `GET /api/services` — Available services
- `POST /api/services/<domain>/<service>` — Call a service
- `GET /api/events` — Event types
- `POST /api/events/<event_type>` — Fire an event
- `GET /api/history/period/<timestamp>` — State history
- `GET /api/logbook/<timestamp>` — Logbook entries
- `GET /api/error_log` — Error log (plain text)
- `GET /api/calendars` — Calendar list
- `GET /api/calendars/<entity_id>` — Calendar events
- `POST /api/template` — Render Jinja2 template
- `POST /api/config/core/check_config` — Validate config
- `POST /api/intent/handle` — Handle intent

## Agent Tools

| Tool | Description |
|------|-------------|
| `ha_get_states` | Get entity states (optional `domain` filter) |
| `ha_get_state` | Get single entity state |
| `ha_set_state` | Create/update entity state |
| `ha_delete_state` | Delete an entity's state |
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

## Development

Run from `homeassistant-plugin/` directory:

```bash
npm run check       # Full suite: typecheck + lint + format + test
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
npm run lint:fix    # ESLint with auto-fix
npm run format      # Prettier format
npm run test        # Run tests once
npm run test:watch  # Watch mode
```

Test files:
- `src/client.test.ts` - Client unit tests (mocked fetch, 35 tests)
