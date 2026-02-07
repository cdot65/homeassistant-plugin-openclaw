/**
 * Home Assistant REST API Client
 *
 * Pure TypeScript HTTP client wrapping the Home Assistant REST API.
 * Uses native fetch() — no external dependencies.
 */

import type {
  HAConfig,
  HAClientResult,
  APIStatus,
  HAConfiguration,
  EntityState,
  EventEntry,
  ServiceDomain,
  HistoryEntry,
  LogbookEntry,
  CalendarEntity,
  CalendarEvent,
  ConfigCheckResult,
  EventFireResult,
  StateUpdateRequest,
  ServiceCallRequest,
  TemplateRenderRequest,
  IntentHandleRequest,
  HistoryOptions,
  LogbookOptions,
  CalendarOptions,
  ServiceCallResponse,
} from "./types";

const DEFAULT_TIMEOUT_MS = 10_000;

// ── Configuration ───────────────────────────────────────────────────

function getConfig(): HAConfig {
  const baseUrl = process.env.HA_BASE_URL;
  const token = process.env.HA_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "Home Assistant configuration missing. " +
        "Set HA_BASE_URL and HA_TOKEN environment variables."
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""), // strip trailing slashes
    token,
    timeoutMs: process.env.HA_TIMEOUT_MS ? parseInt(process.env.HA_TIMEOUT_MS, 10) : undefined,
  };
}

/** Check whether HA credentials are available (via explicit config or env vars). */
export function isConfigured(config?: HAConfig): boolean {
  if (config?.baseUrl && config?.token) return true;
  return Boolean(process.env.HA_BASE_URL && process.env.HA_TOKEN);
}

// ── HTTP helpers ────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  config?: HAConfig
): Promise<HAClientResult<T>> {
  const cfg = config ?? getConfig();
  const url = `${cfg.baseUrl}${path}`;
  const timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    };

    const init: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        data: undefined as unknown as T,
        latencyMs,
        error: `HTTP ${res.status}: ${text || res.statusText}`,
      };
    }

    // Some endpoints return plain text (e.g. /api/error_log, /api/template)
    const contentType = res.headers.get("content-type") ?? "";
    let data: T;
    if (contentType.includes("application/json")) {
      data = (await res.json()) as T;
    } else {
      data = (await res.text()) as unknown as T;
    }

    return { ok: true, status: res.status, data, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 0,
      data: undefined as unknown as T,
      latencyMs,
      error: message.includes("abort") ? `Request timed out after ${timeoutMs}ms` : message,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API methods ──────────────────────────────────────────────

/** GET /api/ — Check if the API is running. */
export async function getApiStatus(config?: HAConfig): Promise<HAClientResult<APIStatus>> {
  return request<APIStatus>("GET", "/api/", undefined, config);
}

/** GET /api/config — Get HA configuration. */
export async function getConfig_(config?: HAConfig): Promise<HAClientResult<HAConfiguration>> {
  return request<HAConfiguration>("GET", "/api/config", undefined, config);
}

/** GET /api/components — Get loaded components. */
export async function getComponents(config?: HAConfig): Promise<HAClientResult<string[]>> {
  return request<string[]>("GET", "/api/components", undefined, config);
}

/** GET /api/states — Get all entity states. */
export async function getStates(config?: HAConfig): Promise<HAClientResult<EntityState[]>> {
  return request<EntityState[]>("GET", "/api/states", undefined, config);
}

/** GET /api/states/<entity_id> — Get a single entity state. */
export async function getState(
  entityId: string,
  config?: HAConfig
): Promise<HAClientResult<EntityState>> {
  return request<EntityState>("GET", `/api/states/${entityId}`, undefined, config);
}

/** POST /api/states/<entity_id> — Create or update an entity state. */
export async function setState(
  entityId: string,
  state: StateUpdateRequest,
  config?: HAConfig
): Promise<HAClientResult<EntityState>> {
  return request<EntityState>("POST", `/api/states/${entityId}`, state, config);
}

/** DELETE /api/states/<entity_id> — Delete an entity. */
export async function deleteState(
  entityId: string,
  config?: HAConfig
): Promise<HAClientResult<unknown>> {
  return request<unknown>("DELETE", `/api/states/${entityId}`, undefined, config);
}

/** GET /api/events — Get event types and listener counts. */
export async function getEvents(config?: HAConfig): Promise<HAClientResult<EventEntry[]>> {
  return request<EventEntry[]>("GET", "/api/events", undefined, config);
}

/** POST /api/events/<event_type> — Fire an event. */
export async function fireEvent(
  eventType: string,
  eventData?: Record<string, unknown>,
  config?: HAConfig
): Promise<HAClientResult<EventFireResult>> {
  return request<EventFireResult>("POST", `/api/events/${eventType}`, eventData ?? {}, config);
}

/** GET /api/services — Get available services. */
export async function getServices(config?: HAConfig): Promise<HAClientResult<ServiceDomain[]>> {
  return request<ServiceDomain[]>("GET", "/api/services", undefined, config);
}

/** POST /api/services/<domain>/<service> — Call a service. */
export async function callService(
  domain: string,
  service: string,
  data?: ServiceCallRequest,
  options?: { returnResponse?: boolean },
  config?: HAConfig
): Promise<HAClientResult<EntityState[] | ServiceCallResponse>> {
  const suffix = options?.returnResponse ? "?return_response" : "";
  return request<EntityState[] | ServiceCallResponse>(
    "POST",
    `/api/services/${domain}/${service}${suffix}`,
    data ?? {},
    config
  );
}

/** GET /api/history/period — Get state history for entities. */
export async function getHistory(
  opts: HistoryOptions,
  config?: HAConfig
): Promise<HAClientResult<HistoryEntry[][]>> {
  const params = new URLSearchParams();
  params.set("filter_entity_id", opts.filterEntityId);
  if (opts.endTime) params.set("end_time", opts.endTime);
  if (opts.minimalResponse) params.set("minimal_response", "");
  if (opts.noAttributes) params.set("no_attributes", "");
  if (opts.significantChangesOnly) params.set("significant_changes_only", "");

  const timePath = opts.startTime ? `/${opts.startTime}` : "";
  return request<HistoryEntry[][]>(
    "GET",
    `/api/history/period${timePath}?${params.toString()}`,
    undefined,
    config
  );
}

/** GET /api/logbook — Get logbook entries. */
export async function getLogbook(
  opts?: LogbookOptions,
  config?: HAConfig
): Promise<HAClientResult<LogbookEntry[]>> {
  const params = new URLSearchParams();
  if (opts?.entity) params.set("entity", opts.entity);
  if (opts?.endTime) params.set("end_time", opts.endTime);

  const timePath = opts?.startTime ? `/${opts.startTime}` : "";
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : "";
  return request<LogbookEntry[]>("GET", `/api/logbook${timePath}${suffix}`, undefined, config);
}

/** GET /api/error_log — Get error log as plain text. */
export async function getErrorLog(config?: HAConfig): Promise<HAClientResult<string>> {
  return request<string>("GET", "/api/error_log", undefined, config);
}

/** GET /api/calendars — Get list of calendar entities. */
export async function getCalendars(config?: HAConfig): Promise<HAClientResult<CalendarEntity[]>> {
  return request<CalendarEntity[]>("GET", "/api/calendars", undefined, config);
}

/** GET /api/calendars/<entity_id> — Get calendar events. */
export async function getCalendarEvents(
  entityId: string,
  opts: CalendarOptions,
  config?: HAConfig
): Promise<HAClientResult<CalendarEvent[]>> {
  const params = new URLSearchParams();
  params.set("start", opts.start);
  params.set("end", opts.end);
  return request<CalendarEvent[]>(
    "GET",
    `/api/calendars/${entityId}?${params.toString()}`,
    undefined,
    config
  );
}

/** POST /api/template — Render a Jinja2 template. */
export async function renderTemplate(
  template: string,
  config?: HAConfig
): Promise<HAClientResult<string>> {
  const body: TemplateRenderRequest = { template };
  return request<string>("POST", "/api/template", body, config);
}

/** POST /api/config/core/check_config — Check configuration validity. */
export async function checkConfig(config?: HAConfig): Promise<HAClientResult<ConfigCheckResult>> {
  return request<ConfigCheckResult>("POST", "/api/config/core/check_config", {}, config);
}

/** POST /api/intent/handle — Handle an intent. */
export async function handleIntent(
  intent: IntentHandleRequest,
  config?: HAConfig
): Promise<HAClientResult<unknown>> {
  return request<unknown>("POST", "/api/intent/handle", intent, config);
}
