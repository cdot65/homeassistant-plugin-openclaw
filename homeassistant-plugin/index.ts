/**
 * Home Assistant Plugin for OpenClaw
 *
 * Smart home control via the Home Assistant REST API.
 * Pure TypeScript implementation with direct HTTP integration.
 *
 * Provides:
 * - Gateway RPC methods: homeassistant.status, homeassistant.states, homeassistant.call_service
 * - Agent tools: ha_get_states, ha_get_state, ha_call_service, ha_get_services, ha_get_history,
 *   ha_fire_event, ha_render_template
 * - Skill: homeassistant (SKILL.md with agent instructions)
 */

import {
  isConfigured,
  getApiStatus,
  getConfig_,
  getComponents,
  getStates,
  getState,
  setState,
  getEvents,
  fireEvent,
  getServices,
  callService,
  getHistory,
  getLogbook,
  getErrorLog,
  getCalendars,
  getCalendarEvents,
  renderTemplate,
  checkConfig,
  handleIntent,
} from "./src/client";

// ── Plugin config interface ─────────────────────────────────────────

interface HomeAssistantPluginConfig {
  base_url?: string;
  token?: string;
}

// ── Tool types ──────────────────────────────────────────────────────

interface ToolParameterProperty {
  type: string;
  description: string;
  items?: { type: string };
}

interface ToolParameters {
  type: "object";
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

// ── Plugin API type ─────────────────────────────────────────────────

interface PluginApi {
  logger: {
    info: (msg: string) => void;
    debug: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  config: {
    plugins?: {
      entries?: {
        homeassistant?: {
          config?: HomeAssistantPluginConfig;
        };
      };
    };
  };
  registerGatewayMethod: (
    name: string,
    handler: (
      ctx: { respond: (ok: boolean, data: unknown) => void; params?: unknown },
    ) => void | Promise<void>
  ) => void;
  registerTool: (tool: {
    name: string;
    description: string;
    parameters: ToolParameters;
    execute: (_id: string, params: Record<string, unknown>) => Promise<ToolResult>;
  }) => void;
  registerCli: (setup: (ctx: { program: unknown }) => void, opts: { commands: string[] }) => void;
  registerPluginHooksFromDir?: (dir: string) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatToolResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

// ── Plugin registration ─────────────────────────────────────────────

export default function register(api: PluginApi): void {
  api.logger.info("Home Assistant plugin loaded");

  // ── RPC: homeassistant.status ───────────────────────────────────

  api.registerGatewayMethod("homeassistant.status", ({ respond }) => {
    const configured = isConfigured();
    if (!configured) {
      respond(true, {
        plugin: "homeassistant",
        version: "0.1.0",
        status: "missing_config",
        message: "Set HA_BASE_URL and HA_TOKEN environment variables",
      });
      return;
    }
    (async () => {
      try {
        const result = await getApiStatus();
        respond(true, {
          plugin: "homeassistant",
          version: "0.1.0",
          status: result.ok ? "connected" : "error",
          api: result.data,
          latencyMs: result.latencyMs,
          error: result.error,
        });
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    })();
  });

  // ── RPC: homeassistant.states ───────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.registerGatewayMethod("homeassistant.states", (ctx: any) => {
    const { respond, params } = ctx;
    (async () => {
      try {
        const entityId = params?.entity_id as string | undefined;
        if (entityId) {
          const result = await getState(entityId);
          respond(result.ok, result.ok ? result.data : { error: result.error });
        } else {
          const result = await getStates();
          respond(result.ok, result.ok ? result.data : { error: result.error });
        }
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    })();
  });

  // ── RPC: homeassistant.call_service ─────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.registerGatewayMethod("homeassistant.call_service", (ctx: any) => {
    const { respond, params } = ctx;
    (async () => {
      try {
        const domain = params?.domain as string;
        const service = params?.service as string;
        const serviceData = params?.data as Record<string, unknown> | undefined;
        const returnResponse = params?.return_response as boolean | undefined;

        if (!domain || !service) {
          respond(false, { error: "domain and service are required" });
          return;
        }

        const result = await callService(domain, service, serviceData, {
          returnResponse,
        });
        respond(result.ok, result.ok ? result.data : { error: result.error });
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    })();
  });

  // ── Agent tools ─────────────────────────────────────────────────

  api.registerTool({
    name: "ha_get_states",
    description:
      "Get all entity states from Home Assistant. Returns every entity's current state, " +
      "attributes, and last_changed timestamp. Use ha_get_state for a single entity.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(): Promise<ToolResult> {
      const result = await getStates();
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_get_state",
    description:
      "Get the current state of a specific Home Assistant entity. " +
      "Returns state, attributes, last_changed, and last_updated.",
    parameters: {
      type: "object",
      properties: {
        entity_id: {
          type: "string",
          description: 'The entity ID (e.g. "light.living_room", "sensor.temperature")',
        },
      },
      required: ["entity_id"],
    },
    async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
      const result = await getState(params.entity_id as string);
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_call_service",
    description:
      "Call a Home Assistant service. Use this to control devices: turn on/off lights, " +
      "lock/unlock doors, set thermostats, trigger automations, etc.",
    parameters: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: 'The service domain (e.g. "light", "switch", "climate", "automation")',
        },
        service: {
          type: "string",
          description: 'The service to call (e.g. "turn_on", "turn_off", "toggle")',
        },
        entity_id: {
          type: "string",
          description: 'Target entity ID (e.g. "light.living_room")',
        },
        service_data: {
          type: "string",
          description:
            "Additional service data as JSON string " +
            '(e.g. \'{"brightness": 128, "color_name": "blue"}\')',
        },
      },
      required: ["domain", "service"],
    },
    async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
      const data: Record<string, unknown> = {};
      if (params.entity_id) data.entity_id = params.entity_id;

      if (params.service_data) {
        try {
          const extra = JSON.parse(params.service_data as string) as Record<string, unknown>;
          Object.assign(data, extra);
        } catch {
          return formatToolResult({ error: "Invalid JSON in service_data" });
        }
      }

      const result = await callService(
        params.domain as string,
        params.service as string,
        data
      );
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_get_services",
    description:
      "List all available Home Assistant services grouped by domain. " +
      "Use this to discover what services/actions are available for a domain.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(): Promise<ToolResult> {
      const result = await getServices();
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_get_history",
    description:
      "Get state history for one or more entities over a time period. " +
      "Useful for tracking changes, graphing trends, and analyzing device behavior.",
    parameters: {
      type: "object",
      properties: {
        entity_id: {
          type: "string",
          description:
            "Comma-separated entity IDs to get history for " +
            '(e.g. "sensor.temperature,sensor.humidity")',
        },
        start_time: {
          type: "string",
          description: "Start timestamp in ISO 8601 format (default: 1 day ago)",
        },
        end_time: {
          type: "string",
          description: "End timestamp in ISO 8601 format (default: now)",
        },
        minimal_response: {
          type: "string",
          description: 'Set to "true" for compact response (only state + last_changed)',
        },
      },
      required: ["entity_id"],
    },
    async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
      const result = await getHistory({
        filterEntityId: params.entity_id as string,
        startTime: params.start_time as string | undefined,
        endTime: params.end_time as string | undefined,
        minimalResponse: params.minimal_response === "true",
      });
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_fire_event",
    description:
      "Fire a custom event in Home Assistant. " +
      "Events can trigger automations and notify other integrations.",
    parameters: {
      type: "object",
      properties: {
        event_type: {
          type: "string",
          description: 'The event type to fire (e.g. "custom_event")',
        },
        event_data: {
          type: "string",
          description: "Event data as JSON string",
        },
      },
      required: ["event_type"],
    },
    async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
      let data: Record<string, unknown> | undefined;
      if (params.event_data) {
        try {
          data = JSON.parse(params.event_data as string) as Record<string, unknown>;
        } catch {
          return formatToolResult({ error: "Invalid JSON in event_data" });
        }
      }
      const result = await fireEvent(params.event_type as string, data);
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_render_template",
    description:
      "Render a Home Assistant Jinja2 template. " +
      'Use this to evaluate expressions like "{{ states(\'sensor.temperature\') }}" ' +
      "or build dynamic content using HA state data.",
    parameters: {
      type: "object",
      properties: {
        template: {
          type: "string",
          description:
            "Jinja2 template string to render " +
            "(e.g. \"{{ states('sensor.temperature') }}\")",
        },
      },
      required: ["template"],
    },
    async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
      const result = await renderTemplate(params.template as string);
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult({ rendered: result.data });
    },
  });

  api.registerTool({
    name: "ha_set_state",
    description:
      "Create or update a Home Assistant entity state. " +
      "This updates the state representation in HA, not the physical device. " +
      "Use ha_call_service to control actual devices.",
    parameters: {
      type: "object",
      properties: {
        entity_id: {
          type: "string",
          description: 'The entity ID to update (e.g. "sensor.custom_value")',
        },
        state: {
          type: "string",
          description: "The new state value",
        },
        attributes: {
          type: "string",
          description:
            "JSON string of attributes to set " +
            '(e.g. \'{"unit_of_measurement": "°C", "friendly_name": "My Sensor"}\')',
        },
      },
      required: ["entity_id", "state"],
    },
    async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
      let attributes: Record<string, unknown> | undefined;
      if (params.attributes) {
        try {
          attributes = JSON.parse(params.attributes as string) as Record<string, unknown>;
        } catch {
          return formatToolResult({ error: "Invalid JSON in attributes" });
        }
      }
      const result = await setState(params.entity_id as string, {
        state: params.state as string,
        attributes,
      });
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_get_logbook",
    description:
      "Get logbook entries from Home Assistant. Shows a timeline of events and state changes.",
    parameters: {
      type: "object",
      properties: {
        entity_id: {
          type: "string",
          description: "Filter to a single entity ID",
        },
        start_time: {
          type: "string",
          description: "Start timestamp in ISO 8601 format (default: 1 day ago)",
        },
        end_time: {
          type: "string",
          description: "End timestamp in ISO 8601 format",
        },
      },
    },
    async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
      const result = await getLogbook({
        entity: params.entity_id as string | undefined,
        startTime: params.start_time as string | undefined,
        endTime: params.end_time as string | undefined,
      });
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_get_calendars",
    description:
      "Get calendar entities and their events from Home Assistant. " +
      "Without parameters, lists all calendars. With entity_id and date range, returns events.",
    parameters: {
      type: "object",
      properties: {
        entity_id: {
          type: "string",
          description: 'Calendar entity ID (e.g. "calendar.personal")',
        },
        start: {
          type: "string",
          description: "Start timestamp in ISO 8601 (required when entity_id is set)",
        },
        end: {
          type: "string",
          description: "End timestamp in ISO 8601 (required when entity_id is set)",
        },
      },
    },
    async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
      if (params.entity_id && params.start && params.end) {
        const result = await getCalendarEvents(
          params.entity_id as string,
          { start: params.start as string, end: params.end as string }
        );
        if (!result.ok) return formatToolResult({ error: result.error });
        return formatToolResult(result.data);
      }
      const result = await getCalendars();
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  // ── Additional RPC/utility tools ────────────────────────────────

  api.registerTool({
    name: "ha_get_error_log",
    description: "Get the current Home Assistant error log.",
    parameters: { type: "object", properties: {} },
    async execute(): Promise<ToolResult> {
      const result = await getErrorLog();
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult({ log: result.data });
    },
  });

  api.registerTool({
    name: "ha_check_config",
    description: "Check if the Home Assistant configuration.yaml is valid.",
    parameters: { type: "object", properties: {} },
    async execute(): Promise<ToolResult> {
      const result = await checkConfig();
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_handle_intent",
    description:
      "Handle a Home Assistant intent. " +
      'Intents are named actions like "SetTimer", "TurnOnLight", etc.',
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: 'Intent name (e.g. "SetTimer", "TurnOnLight")',
        },
        data: {
          type: "string",
          description: 'Intent data as JSON string (e.g. \'{"seconds": "30"}\')',
        },
      },
      required: ["name"],
    },
    async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
      let data: Record<string, unknown> | undefined;
      if (params.data) {
        try {
          data = JSON.parse(params.data as string) as Record<string, unknown>;
        } catch {
          return formatToolResult({ error: "Invalid JSON in data" });
        }
      }
      const result = await handleIntent({ name: params.name as string, data });
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_get_events",
    description: "List all available event types and their listener counts in Home Assistant.",
    parameters: { type: "object", properties: {} },
    async execute(): Promise<ToolResult> {
      const result = await getEvents();
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_get_config",
    description:
      "Get the Home Assistant server configuration including location, timezone, " +
      "version, components, and unit system.",
    parameters: { type: "object", properties: {} },
    async execute(): Promise<ToolResult> {
      const result = await getConfig_();
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  api.registerTool({
    name: "ha_get_components",
    description: "List all currently loaded Home Assistant components/integrations.",
    parameters: { type: "object", properties: {} },
    async execute(): Promise<ToolResult> {
      const result = await getComponents();
      if (!result.ok) return formatToolResult({ error: result.error });
      return formatToolResult(result.data);
    },
  });

  // ── CLI commands ────────────────────────────────────────────────

  api.registerCli(
    ({ program }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prog = program as any;

      prog
        .command("homeassistant")
        .description("Show Home Assistant plugin status")
        .action(async () => {
          const configured = isConfigured();
          console.log("Home Assistant Plugin Status");
          console.log("----------------------------");
          console.log(`Version: 0.1.0`);
          console.log(`Config: ${configured ? "configured" : "MISSING"}`);
          if (!configured) {
            console.log("\nSet HA_BASE_URL and HA_TOKEN environment variables");
            return;
          }
          const result = await getApiStatus();
          console.log(`API: ${result.ok ? "connected" : "unreachable"}`);
          console.log(`Latency: ${result.latencyMs}ms`);
          if (result.error) console.log(`Error: ${result.error}`);
        });

      prog
        .command("ha-states [entity_id]")
        .description("Get Home Assistant entity states")
        .option("--json", "Output as JSON")
        .action(async (entityId: string | undefined, opts: Record<string, string>) => {
          if (entityId) {
            const result = await getState(entityId);
            if (opts.json) {
              console.log(JSON.stringify(result.data, null, 2));
            } else {
              if (!result.ok) {
                console.log(`Error: ${result.error}`);
                return;
              }
              console.log(`${result.data.entity_id}: ${result.data.state}`);
              const attrs = Object.entries(result.data.attributes);
              if (attrs.length > 0) {
                for (const [k, v] of attrs) {
                  console.log(`  ${k}: ${v}`);
                }
              }
            }
          } else {
            const result = await getStates();
            if (!result.ok) {
              console.log(`Error: ${result.error}`);
              return;
            }
            if (opts.json) {
              console.log(JSON.stringify(result.data, null, 2));
            } else {
              for (const entity of result.data) {
                console.log(`${entity.entity_id}: ${entity.state}`);
              }
            }
          }
        });
    },
    { commands: ["homeassistant", "ha-states"] }
  );
}

// Export plugin metadata
export const id = "homeassistant";
export const name = "Home Assistant";
export const version = "0.1.0";

// Re-export client functions and types
export {
  isConfigured,
  getApiStatus,
  getComponents,
  getStates,
  getState,
  setState,
  callService,
  getServices,
  getHistory,
  getLogbook,
  getErrorLog,
  getCalendars,
  getCalendarEvents,
  renderTemplate,
  checkConfig,
  handleIntent,
  fireEvent,
  getEvents,
} from "./src/client";

export type {
  HAConfig,
  HAClientResult,
  EntityState,
  ServiceDomain,
  ServiceCallRequest,
} from "./src/types";
