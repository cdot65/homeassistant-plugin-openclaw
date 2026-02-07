# Release Notes

## v0.1.0 - Initial Release

**Released**: 2026-02-07

### Features

- **Home Assistant REST API client** — pure TypeScript with direct `fetch()`, no external dependencies
- **Gateway RPC** — `homeassistant.status`, `homeassistant.states`, `homeassistant.call_service`
- **17 agent tools** — full HA REST API coverage:
  - State management: `ha_get_states`, `ha_get_state`, `ha_set_state`, `ha_delete_state`
  - Device control: `ha_call_service`
  - Discovery: `ha_get_services`, `ha_get_events`, `ha_get_components`
  - History/logging: `ha_get_history`, `ha_get_logbook`, `ha_get_error_log`
  - Events: `ha_fire_event`
  - Calendars: `ha_get_calendars`
  - Templates: `ha_render_template`
  - Config: `ha_get_config`, `ha_check_config`
  - Intents: `ha_handle_intent`
- **CLI commands** — `openclaw homeassistant` for status, `openclaw ha-states` for entity queries
- **Skill** — `SKILL.md` with agent instructions for smart home workflows (entity ID patterns, common service calls, discovery workflow)
- **Configuration** — env vars `HA_BASE_URL`, `HA_TOKEN`, optional `HA_TIMEOUT_MS`
