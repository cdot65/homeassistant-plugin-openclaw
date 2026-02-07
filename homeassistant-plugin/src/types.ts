/**
 * TypeScript types for the Home Assistant REST API.
 *
 * Based on: https://developers.home-assistant.io/docs/api/rest/
 */

// ── Connection configuration ────────────────────────────────────────

export interface HAConfig {
  /** Base URL of the Home Assistant instance (e.g. "http://192.168.1.100:8123") */
  baseUrl: string;
  /** Long-lived access token for authentication */
  token: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
}

// ── API response types ──────────────────────────────────────────────

/** GET /api/ */
export interface APIStatus {
  message: string;
}

/** GET /api/config */
export interface HAConfiguration {
  components: string[];
  config_dir: string;
  elevation: number;
  latitude: number;
  location_name: string;
  longitude: number;
  time_zone: string;
  unit_system: {
    length: string;
    mass: string;
    temperature: string;
    volume: string;
  };
  version: string;
  whitelist_external_dirs: string[];
}

/** Entity state object — used across multiple endpoints */
export interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context?: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

/** GET /api/events — individual event entry */
export interface EventEntry {
  event: string;
  listener_count: number;
}

/** GET /api/services — individual service domain */
export interface ServiceDomain {
  domain: string;
  services: Record<
    string,
    {
      name?: string;
      description?: string;
      fields?: Record<string, unknown>;
      target?: Record<string, unknown>;
    }
  >;
}

/** GET /api/history/period — individual history entry */
export interface HistoryEntry {
  entity_id?: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed: string;
  last_updated?: string;
}

/** GET /api/logbook — individual logbook entry */
export interface LogbookEntry {
  context_user_id: string | null;
  domain: string;
  entity_id: string;
  message: string;
  name: string;
  when: string;
}

/** GET /api/calendars — individual calendar entry */
export interface CalendarEntity {
  entity_id: string;
  name: string;
}

/** Calendar event date/time — either date or dateTime */
export interface CalendarDateTime {
  date?: string;
  dateTime?: string;
}

/** GET /api/calendars/<entity_id> — individual calendar event */
export interface CalendarEvent {
  summary: string;
  start: CalendarDateTime;
  end: CalendarDateTime;
  description?: string;
  location?: string;
}

/** POST /api/config/core/check_config */
export interface ConfigCheckResult {
  errors: string | null;
  result: "valid" | "invalid";
}

/** POST /api/events/<event_type> */
export interface EventFireResult {
  message: string;
}

/** POST /api/services/<domain>/<service> with ?return_response */
export interface ServiceCallResponse {
  changed_states: EntityState[];
  service_response: Record<string, unknown>;
}

// ── Request types ───────────────────────────────────────────────────

/** POST /api/states/<entity_id> */
export interface StateUpdateRequest {
  state: string;
  attributes?: Record<string, unknown>;
}

/** POST /api/services/<domain>/<service> */
export interface ServiceCallRequest {
  entity_id?: string;
  [key: string]: unknown;
}

/** POST /api/template */
export interface TemplateRenderRequest {
  template: string;
}

/** POST /api/intent/handle */
export interface IntentHandleRequest {
  name: string;
  data?: Record<string, unknown>;
}

/** Options for GET /api/history/period */
export interface HistoryOptions {
  /** Start timestamp (ISO 8601). Defaults to 1 day before now. */
  startTime?: string;
  /** End timestamp (ISO 8601). Defaults to 1 day after start. */
  endTime?: string;
  /** Comma-separated entity IDs (required). */
  filterEntityId: string;
  /** Only return last_changed + state for intermediate entries. */
  minimalResponse?: boolean;
  /** Skip returning attributes. */
  noAttributes?: boolean;
  /** Only return significant state changes. */
  significantChangesOnly?: boolean;
}

/** Options for GET /api/logbook */
export interface LogbookOptions {
  /** Start timestamp (ISO 8601). Defaults to 1 day before now. */
  startTime?: string;
  /** End timestamp (ISO 8601). */
  endTime?: string;
  /** Single entity ID to filter on. */
  entity?: string;
}

/** Options for GET /api/calendars/<entity_id> */
export interface CalendarOptions {
  /** Start timestamp (ISO 8601, required). */
  start: string;
  /** End timestamp (ISO 8601, required). */
  end: string;
}

// ── Client response wrapper ─────────────────────────────────────────

export interface HAClientResult<T> {
  ok: boolean;
  status: number;
  data: T;
  latencyMs: number;
  error?: string;
}
