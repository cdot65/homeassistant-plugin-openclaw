# Home Assistant Plugin for OpenClaw

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenClaw plugin wrapping the [Home Assistant](https://www.home-assistant.io/) REST API in pure TypeScript. Query states, call services, view history, fire events, and more.

## Installation

```bash
npm install @cdot65/homeassistant
```

Or via the OpenClaw CLI:

```bash
openclaw plugins install @cdot65/homeassistant
```

Then restart the gateway:

```bash
openclaw gateway restart
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HA_BASE_URL` | Yes | -- | Home Assistant base URL (e.g. `http://homeassistant.local:8123`) |
| `HA_TOKEN` | Yes | -- | Long-lived access token |
| `HA_TIMEOUT_MS` | No | `10000` | Request timeout in milliseconds |

```bash
export HA_BASE_URL="http://homeassistant.local:8123"
export HA_TOKEN="your-long-lived-access-token"
```

Plugin config fields `base_url` and `token` override the corresponding env vars when set.

**Creating an access token:** In Home Assistant, go to Profile > Long-Lived Access Tokens > Create Token.

## Verify

```bash
openclaw homeassistant
openclaw ha-states
openclaw gateway call homeassistant.status
```

## Usage

### CLI

```bash
openclaw homeassistant              # connection status
openclaw ha-states                   # all entity states
openclaw ha-states light.bedroom     # single entity
openclaw ha-states --json            # JSON output
```

### Gateway RPC

```bash
openclaw gateway call homeassistant.status
openclaw gateway call homeassistant.states --params '{"entity_id":"light.living_room"}'
openclaw gateway call homeassistant.call_service --params '{"domain":"light","service":"turn_on","data":{"entity_id":"light.living_room"}}'
```

## Agent Tools

17 tools covering the full HA REST API:

| Tool | Description |
|------|-------------|
| `ha_get_states` | Get entity states (optional domain filter) |
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

## Requirements

- Node.js 18+
- Home Assistant instance with REST API enabled
- Long-lived access token

## Development

From `homeassistant-plugin/`:

```bash
npm run check       # typecheck + lint + format + test
npm test            # tests only
npm run test:watch  # watch mode
```

## License

MIT
