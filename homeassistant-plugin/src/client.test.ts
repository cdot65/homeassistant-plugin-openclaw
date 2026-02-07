/**
 * Home Assistant REST API Client — Unit Tests
 *
 * All HTTP calls are mocked via vi.stubGlobal("fetch", ...).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isConfigured,
  getApiStatus,
  getConfig_,
  getComponents,
  getStates,
  getState,
  setState,
  deleteState,
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
} from "./client";
import type { HAConfig } from "./types";

// ── Test helpers ────────────────────────────────────────────────────

const TEST_CONFIG: HAConfig = {
  baseUrl: "http://homeassistant.local:8123",
  token: "test-token-abc123",
  timeoutMs: 5000,
};

function mockFetchResponse(body: unknown, status = 200, contentType = "application/json") {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {
      get: (name: string) => (name === "content-type" ? contentType : null),
    },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
  return vi.fn().mockResolvedValue(response);
}

function mockFetchError(message: string) {
  return vi.fn().mockRejectedValue(new Error(message));
}

// ── Tests ───────────────────────────────────────────────────────────

describe("isConfigured", () => {
  const origBaseUrl = process.env.HA_BASE_URL;
  const origToken = process.env.HA_TOKEN;

  afterEach(() => {
    if (origBaseUrl !== undefined) process.env.HA_BASE_URL = origBaseUrl;
    else delete process.env.HA_BASE_URL;
    if (origToken !== undefined) process.env.HA_TOKEN = origToken;
    else delete process.env.HA_TOKEN;
  });

  it("returns true when both env vars are set", () => {
    process.env.HA_BASE_URL = "http://localhost:8123";
    process.env.HA_TOKEN = "test-token";
    expect(isConfigured()).toBe(true);
  });

  it("returns false when HA_BASE_URL is missing", () => {
    delete process.env.HA_BASE_URL;
    process.env.HA_TOKEN = "test-token";
    expect(isConfigured()).toBe(false);
  });

  it("returns false when HA_TOKEN is missing", () => {
    process.env.HA_BASE_URL = "http://localhost:8123";
    delete process.env.HA_TOKEN;
    expect(isConfigured()).toBe(false);
  });

  it("returns false when both are missing", () => {
    delete process.env.HA_BASE_URL;
    delete process.env.HA_TOKEN;
    expect(isConfigured()).toBe(false);
  });

  it("returns true when explicit config has both baseUrl and token", () => {
    delete process.env.HA_BASE_URL;
    delete process.env.HA_TOKEN;
    expect(isConfigured({ baseUrl: "http://ha:8123", token: "tok" })).toBe(true);
  });

  it("returns false when explicit config is missing token", () => {
    delete process.env.HA_BASE_URL;
    delete process.env.HA_TOKEN;
    expect(isConfigured({ baseUrl: "http://ha:8123", token: "" })).toBe(false);
  });
});

describe("getApiStatus", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns API status on success", async () => {
    const fetchMock = mockFetchResponse({ message: "API running." });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getApiStatus(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data.message).toBe("API running.");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://homeassistant.local:8123/api/");
    expect(opts.method).toBe("GET");
    expect(opts.headers.Authorization).toBe("Bearer test-token-abc123");
  });

  it("returns error on non-200 response", async () => {
    const fetchMock = mockFetchResponse("Unauthorized", 401, "text/plain");
    vi.stubGlobal("fetch", fetchMock);

    const result = await getApiStatus(TEST_CONFIG);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toContain("401");
  });

  it("returns error on network failure", async () => {
    vi.stubGlobal("fetch", mockFetchError("fetch failed"));

    const result = await getApiStatus(TEST_CONFIG);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe("fetch failed");
  });
});

describe("getConfig_", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns HA configuration", async () => {
    const configData = {
      components: ["light", "switch"],
      config_dir: "/config",
      elevation: 100,
      latitude: 40.7,
      location_name: "Home",
      longitude: -74.0,
      time_zone: "America/New_York",
      unit_system: { length: "mi", mass: "lb", temperature: "°F", volume: "gal" },
      version: "2025.1.0",
      whitelist_external_dirs: ["/config/www"],
    };
    vi.stubGlobal("fetch", mockFetchResponse(configData));

    const result = await getConfig_(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data.version).toBe("2025.1.0");
    expect(result.data.location_name).toBe("Home");
    expect(result.data.components).toContain("light");
  });
});

describe("getComponents", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns component list", async () => {
    const components = ["light", "switch", "sensor", "automation"];
    vi.stubGlobal("fetch", mockFetchResponse(components));

    const result = await getComponents(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(components);
  });
});

describe("getStates", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns all entity states", async () => {
    const states = [
      {
        entity_id: "light.living_room",
        state: "on",
        attributes: { brightness: 255 },
        last_changed: "2025-01-01T00:00:00+00:00",
        last_updated: "2025-01-01T00:00:00+00:00",
      },
      {
        entity_id: "sensor.temperature",
        state: "72",
        attributes: { unit_of_measurement: "°F" },
        last_changed: "2025-01-01T00:00:00+00:00",
        last_updated: "2025-01-01T00:00:00+00:00",
      },
    ];
    vi.stubGlobal("fetch", mockFetchResponse(states));

    const result = await getStates(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].entity_id).toBe("light.living_room");
    expect(result.data[1].state).toBe("72");
  });
});

describe("getState", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns a single entity state", async () => {
    const state = {
      entity_id: "light.living_room",
      state: "on",
      attributes: { brightness: 200, friendly_name: "Living Room" },
      last_changed: "2025-01-01T12:00:00+00:00",
      last_updated: "2025-01-01T12:00:00+00:00",
    };
    const fetchMock = mockFetchResponse(state);
    vi.stubGlobal("fetch", fetchMock);

    const result = await getState("light.living_room", TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data.entity_id).toBe("light.living_room");
    expect(result.data.state).toBe("on");
    expect(result.data.attributes.brightness).toBe(200);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("http://homeassistant.local:8123/api/states/light.living_room");
  });

  it("returns 404 for unknown entity", async () => {
    vi.stubGlobal("fetch", mockFetchResponse("Not found", 404, "text/plain"));

    const result = await getState("light.nonexistent", TEST_CONFIG);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });
});

describe("setState", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("creates/updates an entity state", async () => {
    const responseState = {
      entity_id: "sensor.custom",
      state: "25",
      attributes: { unit_of_measurement: "°C" },
      last_changed: "2025-01-01T12:00:00+00:00",
      last_updated: "2025-01-01T12:00:00+00:00",
    };
    const fetchMock = mockFetchResponse(responseState, 201);
    vi.stubGlobal("fetch", fetchMock);

    const result = await setState(
      "sensor.custom",
      { state: "25", attributes: { unit_of_measurement: "°C" } },
      TEST_CONFIG
    );

    expect(result.ok).toBe(true);
    expect(result.data.state).toBe("25");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://homeassistant.local:8123/api/states/sensor.custom");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({
      state: "25",
      attributes: { unit_of_measurement: "°C" },
    });
  });
});

describe("deleteState", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("deletes an entity", async () => {
    const fetchMock = mockFetchResponse({});
    vi.stubGlobal("fetch", fetchMock);

    const result = await deleteState("sensor.custom", TEST_CONFIG);

    expect(result.ok).toBe(true);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://homeassistant.local:8123/api/states/sensor.custom");
    expect(opts.method).toBe("DELETE");
  });
});

describe("getEvents", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns event types", async () => {
    const events = [
      { event: "state_changed", listener_count: 5 },
      { event: "time_changed", listener_count: 2 },
    ];
    vi.stubGlobal("fetch", mockFetchResponse(events));

    const result = await getEvents(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].event).toBe("state_changed");
  });
});

describe("fireEvent", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fires an event with data", async () => {
    const fetchMock = mockFetchResponse({ message: "Event my_event fired." });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fireEvent("my_event", { key: "value" }, TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data.message).toContain("my_event");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://homeassistant.local:8123/api/events/my_event");
    expect(JSON.parse(opts.body)).toEqual({ key: "value" });
  });

  it("fires an event without data", async () => {
    const fetchMock = mockFetchResponse({ message: "Event test fired." });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fireEvent("test", undefined, TEST_CONFIG);

    expect(result.ok).toBe(true);
    const [, opts] = fetchMock.mock.calls[0];
    expect(JSON.parse(opts.body)).toEqual({});
  });
});

describe("getServices", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns service domains", async () => {
    const services = [
      { domain: "light", services: { turn_on: {}, turn_off: {}, toggle: {} } },
      { domain: "switch", services: { turn_on: {}, turn_off: {} } },
    ];
    vi.stubGlobal("fetch", mockFetchResponse(services));

    const result = await getServices(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].domain).toBe("light");
    expect(Object.keys(result.data[0].services)).toContain("turn_on");
  });
});

describe("callService", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("calls a service and returns changed states", async () => {
    const changedStates = [
      {
        entity_id: "light.living_room",
        state: "on",
        attributes: {},
        last_changed: "2025-01-01T12:00:00+00:00",
        last_updated: "2025-01-01T12:00:00+00:00",
      },
    ];
    const fetchMock = mockFetchResponse(changedStates);
    vi.stubGlobal("fetch", fetchMock);

    const result = await callService(
      "light",
      "turn_on",
      { entity_id: "light.living_room" },
      undefined,
      TEST_CONFIG
    );

    expect(result.ok).toBe(true);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://homeassistant.local:8123/api/services/light/turn_on");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ entity_id: "light.living_room" });
  });

  it("supports return_response parameter", async () => {
    const fetchMock = mockFetchResponse({ changed_states: [], service_response: {} });
    vi.stubGlobal("fetch", fetchMock);

    await callService("weather", "get_forecasts", {}, { returnResponse: true }, TEST_CONFIG);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("?return_response");
  });
});

describe("getHistory", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("gets history for an entity", async () => {
    const history = [
      [
        {
          entity_id: "sensor.temperature",
          state: "70",
          last_changed: "2025-01-01T00:00:00+00:00",
        },
        {
          entity_id: "sensor.temperature",
          state: "72",
          last_changed: "2025-01-01T06:00:00+00:00",
        },
      ],
    ];
    const fetchMock = mockFetchResponse(history);
    vi.stubGlobal("fetch", fetchMock);

    const result = await getHistory({ filterEntityId: "sensor.temperature" }, TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toHaveLength(2);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("filter_entity_id=sensor.temperature");
  });

  it("includes optional parameters in URL", async () => {
    const fetchMock = mockFetchResponse([[]]);
    vi.stubGlobal("fetch", fetchMock);

    await getHistory(
      {
        filterEntityId: "sensor.temp",
        startTime: "2025-01-01T00:00:00Z",
        endTime: "2025-01-02T00:00:00Z",
        minimalResponse: true,
        noAttributes: true,
      },
      TEST_CONFIG
    );

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/history/period/2025-01-01T00:00:00Z");
    expect(url).toContain("end_time=2025-01-02T00%3A00%3A00Z");
    expect(url).toContain("minimal_response=");
    expect(url).toContain("no_attributes=");
  });
});

describe("getLogbook", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("gets logbook entries", async () => {
    const entries = [
      {
        context_user_id: null,
        domain: "light",
        entity_id: "light.living_room",
        message: "turned on",
        name: "Living Room",
        when: "2025-01-01T12:00:00+00:00",
      },
    ];
    vi.stubGlobal("fetch", mockFetchResponse(entries));

    const result = await getLogbook(undefined, TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].entity_id).toBe("light.living_room");
  });

  it("filters by entity", async () => {
    const fetchMock = mockFetchResponse([]);
    vi.stubGlobal("fetch", fetchMock);

    await getLogbook({ entity: "light.living_room" }, TEST_CONFIG);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("entity=light.living_room");
  });
});

describe("getErrorLog", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns plain text error log", async () => {
    const logText = "2025-01-01 ERROR some.component: Something went wrong";
    vi.stubGlobal("fetch", mockFetchResponse(logText, 200, "text/plain"));

    const result = await getErrorLog(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data).toContain("ERROR");
  });
});

describe("getCalendars", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns calendar entities", async () => {
    const calendars = [
      { entity_id: "calendar.holidays", name: "Holidays" },
      { entity_id: "calendar.personal", name: "Personal" },
    ];
    vi.stubGlobal("fetch", mockFetchResponse(calendars));

    const result = await getCalendars(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe("Holidays");
  });
});

describe("getCalendarEvents", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns calendar events for a date range", async () => {
    const events = [
      {
        summary: "Birthday Party",
        start: { dateTime: "2025-01-15T18:00:00-05:00" },
        end: { dateTime: "2025-01-15T22:00:00-05:00" },
        description: "Don't forget cake",
      },
    ];
    const fetchMock = mockFetchResponse(events);
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCalendarEvents(
      "calendar.personal",
      { start: "2025-01-01T00:00:00Z", end: "2025-02-01T00:00:00Z" },
      TEST_CONFIG
    );

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].summary).toBe("Birthday Party");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/calendars/calendar.personal");
    expect(url).toContain("start=");
    expect(url).toContain("end=");
  });
});

describe("renderTemplate", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders a Jinja2 template", async () => {
    const fetchMock = mockFetchResponse("72 °F", 200, "text/plain");
    vi.stubGlobal("fetch", fetchMock);

    const result = await renderTemplate("{{ states('sensor.temperature') }} °F", TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data).toBe("72 °F");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://homeassistant.local:8123/api/template");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({
      template: "{{ states('sensor.temperature') }} °F",
    });
  });
});

describe("checkConfig", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns valid config check", async () => {
    vi.stubGlobal("fetch", mockFetchResponse({ errors: null, result: "valid" }));

    const result = await checkConfig(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data.result).toBe("valid");
    expect(result.data.errors).toBeNull();
  });

  it("returns invalid config check", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResponse({ errors: "Integration not found: bad_integration:", result: "invalid" })
    );

    const result = await checkConfig(TEST_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.data.result).toBe("invalid");
    expect(result.data.errors).toContain("bad_integration");
  });
});

describe("handleIntent", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("handles an intent with data", async () => {
    const fetchMock = mockFetchResponse({
      speech: { plain: { speech: "Timer set for 30 seconds" } },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleIntent({ name: "SetTimer", data: { seconds: "30" } }, TEST_CONFIG);

    expect(result.ok).toBe(true);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://homeassistant.local:8123/api/intent/handle");
    expect(JSON.parse(opts.body)).toEqual({ name: "SetTimer", data: { seconds: "30" } });
  });
});

describe("timeout handling", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("reports timeout on abort", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const result = await getApiStatus({
      ...TEST_CONFIG,
      timeoutMs: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("timed out");
  });
});

describe("auth header", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("sends Bearer token in Authorization header", async () => {
    const fetchMock = mockFetchResponse({ message: "API running." });
    vi.stubGlobal("fetch", fetchMock);

    await getApiStatus(TEST_CONFIG);

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers.Authorization).toBe("Bearer test-token-abc123");
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });
});
