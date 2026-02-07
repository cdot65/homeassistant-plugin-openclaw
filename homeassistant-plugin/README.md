# @cdot65/homeassistant

OpenClaw plugin for [Home Assistant](https://www.home-assistant.io/) -- query states, call services, view history, fire events, and more via the HA REST API.

## Install

```bash
npm install @cdot65/homeassistant
```

## Configuration

| Variable        | Required | Default | Description             |
| --------------- | -------- | ------- | ----------------------- |
| `HA_BASE_URL`   | Yes      | --      | Home Assistant base URL |
| `HA_TOKEN`      | Yes      | --      | Long-lived access token |
| `HA_TIMEOUT_MS` | No       | `10000` | Request timeout (ms)    |

```bash
export HA_BASE_URL="http://homeassistant.local:8123"
export HA_TOKEN="your-long-lived-access-token"
```

**Creating an access token:** In Home Assistant, go to Profile > Long-Lived Access Tokens > Create Token.

## Verify

```bash
openclaw gateway restart
openclaw homeassistant
openclaw ha-states
```

## Agent Tools

17 tools covering the full HA REST API: states, services, history, events, calendars, templates, config, intents.

See the [full documentation](https://github.com/cdot65/homeassistant-plugin-openclaw) for details.

## Requirements

- Node.js 18+
- Home Assistant with REST API enabled
- Long-lived access token

## License

MIT
