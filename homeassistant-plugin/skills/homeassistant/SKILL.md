---
name: homeassistant
description: Control smart home devices and query Home Assistant via its REST API
metadata:
  {
    "openclaw":
      {
        "requires": { "env": ["HA_BASE_URL", "HA_TOKEN"] },
        "primaryEnv": "HA_TOKEN",
        "emoji": "🏠",
      },
  }
---

# Home Assistant Skill

You have access to a Home Assistant instance via the following tools. Use them to help users monitor and control their smart home.

## Available Tools

### Querying state

- **ha_get_states** `domain?` — List entity states. Optionally filter by domain (e.g. `domain="light"`). Returns current state, attributes, and timestamps. Can be large without a filter; prefer `ha_get_state` for a single entity.
- **ha_get_state** `entity_id` — Get a single entity's current state and attributes.
- **ha_get_history** `entity_id` `start_time?` `end_time?` `minimal_response?` — Get historical state changes. `entity_id` can be comma-separated for multiple entities. Defaults to the last 24 hours.
- **ha_get_logbook** `entity_id?` `start_time?` `end_time?` — Get event log entries. Filters to a single entity or shows all.
- **ha_get_config** — Server configuration: location, timezone, version, installed components.
- **ha_get_components** — List all loaded integrations/components.
- **ha_get_error_log** — Retrieve the current session's error log (plain text).

### Controlling devices

- **ha_call_service** `domain` `service` `entity_id?` `service_data?` — Call any HA service. This is the primary way to control devices.
  - Turn on a light: `domain="light"` `service="turn_on"` `entity_id="light.living_room"`
  - Set brightness: `domain="light"` `service="turn_on"` `entity_id="light.bedroom"` `service_data='{"brightness": 128}'`
  - Lock a door: `domain="lock"` `service="lock"` `entity_id="lock.front_door"`
  - Set thermostat: `domain="climate"` `service="set_temperature"` `entity_id="climate.main"` `service_data='{"temperature": 72}'`
  - Trigger automation: `domain="automation"` `service="trigger"` `entity_id="automation.morning_routine"`
- **ha_set_state** `entity_id` `state` `attributes?` — Update an entity's state representation in HA. Note: this does NOT control physical devices (use `ha_call_service` for that). Useful for creating virtual sensors or updating input helpers.
- **ha_delete_state** `entity_id` — Delete an entity's state from HA. Only removes the state object, not the device.

### Events and services

- **ha_get_services** — List all available services by domain. Use to discover what actions are available.
- **ha_get_events** — List all event types and listener counts.
- **ha_fire_event** `event_type` `event_data?` — Fire a custom event. Can trigger automations listening for that event.

### Calendars

- **ha_get_calendars** — List all calendar entities.
- **ha_get_calendars** `entity_id` `start` `end` — Get events for a specific calendar within a date range.

### Templates and configuration

- **ha_render_template** `template` — Render a Jinja2 template using HA's template engine. Useful for evaluating complex state expressions.
- **ha_check_config** — Validate the HA `configuration.yaml` file.
- **ha_handle_intent** `name` `data?` — Handle a named intent (e.g. "SetTimer").

## Patterns

### Entity IDs

Entity IDs follow the format `<domain>.<object_id>`:

- `light.living_room`, `switch.kitchen_plug`, `sensor.temperature`
- `climate.main_thermostat`, `lock.front_door`, `cover.garage`
- `automation.morning_lights`, `script.bedtime`, `scene.movie_night`

### Common service calls

| Action   | Domain                     | Service           | Notes                                  |
| -------- | -------------------------- | ----------------- | -------------------------------------- |
| Turn on  | `light` / `switch` / `fan` | `turn_on`         | Add brightness, color via service_data |
| Turn off | `light` / `switch` / `fan` | `turn_off`        |                                        |
| Toggle   | `light` / `switch` / `fan` | `toggle`          |                                        |
| Lock     | `lock`                     | `lock`            |                                        |
| Unlock   | `lock`                     | `unlock`          |                                        |
| Open     | `cover`                    | `open_cover`      | Garage doors, blinds                   |
| Close    | `cover`                    | `close_cover`     |                                        |
| Set temp | `climate`                  | `set_temperature` | `{"temperature": 72}`                  |
| Set mode | `climate`                  | `set_hvac_mode`   | `{"hvac_mode": "heat"}`                |
| Play     | `media_player`             | `media_play`      |                                        |
| Pause    | `media_player`             | `media_pause`     |                                        |
| Volume   | `media_player`             | `volume_set`      | `{"volume_level": 0.5}`                |
| Trigger  | `automation`               | `trigger`         |                                        |
| Run      | `script`                   | `turn_on`         | or call script.<name> directly         |
| Activate | `scene`                    | `turn_on`         |                                        |

### Workflow

1. **Discover first**: If you don't know what entities exist, use `ha_get_states` or `ha_get_services` to explore.
2. **Be specific**: When the user asks about a device, use `ha_get_state` with the exact entity_id.
3. **Confirm actions**: Before toggling devices, confirm with the user if the intent is ambiguous.
4. **Check results**: After calling a service, use `ha_get_state` to verify the change took effect.
5. **Use history**: When asked about patterns or "what happened", use `ha_get_history` with a relevant time window.
