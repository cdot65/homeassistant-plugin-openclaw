# Home Assistant Plugin for OpenClaw - Project Analysis

**Date**: February 7, 2026  
**Version Analyzed**: 0.1.1

---

## Table of Contents
1. [What This Project Does](#what-this-project-does)
2. [Dependencies](#dependencies)
3. [Security Analysis](#security-analysis)
4. [Recommendations](#recommendations)
5. [Summary](#summary)

---

## What This Project Does

### Overview
The Home Assistant Plugin for OpenClaw is a **TypeScript plugin** that bridges [OpenClaw](https://github.com/cdot65/openclaw) (an AI orchestration platform) with [Home Assistant](https://www.home-assistant.io/) smart home instances. It wraps the Home Assistant REST API, providing programmatic access for AI agents, CLI tools, and RPC methods.

### Core Functionality

#### 1. State Management
- **Query entity states**: Get current state of lights, sensors, switches, and other devices
- **Update states**: Create or modify entity state representations in Home Assistant
- **Delete states**: Remove entity state objects (not the devices themselves)
- **Domain filtering**: Query entities by domain (e.g., all `light.*` entities)

#### 2. Service Control
- **Call services**: Execute Home Assistant services to control devices
  - Turn lights on/off with custom brightness and colors
  - Lock/unlock doors
  - Set thermostat temperatures
  - Trigger automations
  - Control media players
- **Discover services**: List all available services grouped by domain
- **Return responses**: Optionally get service call results

#### 3. History & Analytics
- **State history**: Retrieve historical state changes over time periods
- **Logbook entries**: Access the Home Assistant logbook for event timelines
- **Calendar integration**: List calendars and retrieve calendar events
- **Minimal responses**: Option to reduce payload size for large queries

#### 4. Events & Intents
- **Fire custom events**: Trigger automations and notify other integrations
- **List events**: Discover available event types and listener counts
- **Handle intents**: Process named intents like "SetTimer" or "TurnOnLight"

#### 5. Configuration & Debugging
- **Validate configuration**: Check if `configuration.yaml` is valid
- **Get error logs**: Retrieve Home Assistant error logs
- **Server configuration**: Access system info (timezone, location, version, components)
- **Template rendering**: Evaluate Jinja2 templates with HA state data

### Exposure Methods

The plugin provides **four different interfaces** to access Home Assistant:

#### 1. Gateway RPC Methods (3 methods)
For programmatic access via OpenClaw gateway:
- `homeassistant.status` - Connection status and latency
- `homeassistant.states` - Query entity states (all or single entity)
- `homeassistant.call_service` - Execute Home Assistant services

#### 2. Agent Tools (17 tools)
For AI agents to autonomously control smart home devices:
- `ha_get_states` - Query all or filtered entity states
- `ha_get_state` - Get single entity state
- `ha_set_state` - Create/update entity state
- `ha_delete_state` - Delete entity state
- `ha_call_service` - Call a service to control devices
- `ha_get_services` - List available services
- `ha_get_history` - Get state change history
- `ha_get_logbook` - Get logbook entries
- `ha_fire_event` - Fire a custom event
- `ha_get_events` - List event types
- `ha_render_template` - Render Jinja2 template
- `ha_get_calendars` - List calendars or get events
- `ha_get_config` - Get server configuration
- `ha_get_components` - List loaded components
- `ha_get_error_log` - Get error log
- `ha_check_config` - Validate configuration.yaml
- `ha_handle_intent` - Handle a named intent

#### 3. CLI Commands (2 commands)
For terminal/shell access:
- `openclaw homeassistant` - Show plugin status
- `openclaw ha-states [entity_id]` - Query entity states (supports JSON output)

#### 4. Auto-reply Command (1 command)
For quick status checks:
- `/ha` - Quick connection status and latency

### Use Cases

1. **AI-Powered Home Control**: AI agents can autonomously control smart home devices based on context
2. **Voice Assistants**: Natural language processing to control devices via OpenClaw
3. **Automation Workflows**: Programmatic orchestration of complex multi-device scenarios
4. **Monitoring & Analytics**: Query historical data and generate insights
5. **DevOps Integration**: CLI tools for scripting and CI/CD pipelines
6. **Testing & Development**: Validate Home Assistant configurations and test automations

---

## Dependencies

### Production Dependencies

**ZERO** ✅

The plugin has **no external runtime dependencies**. It uses only:
- **Node.js 18+ built-in APIs**
  - Native `fetch()` for HTTP requests (no axios, node-fetch, etc.)
  - Built-in `AbortController` for request timeouts
  - Standard `JSON.stringify/parse` for data serialization
- **TypeScript** for type safety (compiles to pure JavaScript)

**Benefits**:
- ✅ Minimal supply chain attack surface
- ✅ No dependency security vulnerabilities
- ✅ Faster installation and deployment
- ✅ No dependency version conflicts
- ✅ Smaller package size

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/node` | ^25.1.0 | TypeScript type definitions for Node.js APIs |
| `typescript` | ^5.0.0 | TypeScript compiler for type checking and transpilation |
| `@typescript-eslint/parser` | ^8.0.0 | Parses TypeScript for ESLint |
| `@typescript-eslint/eslint-plugin` | ^8.0.0 | TypeScript-specific linting rules |
| `eslint` | ^9.0.0 | JavaScript/TypeScript linter for code quality |
| `prettier` | ^3.0.0 | Code formatter for consistent style |
| `vitest` | ^2.0.0 | Fast unit testing framework (Vite-powered) |
| `husky` | ^9.0.0 | Git hooks manager for pre-commit checks |
| `lint-staged` | ^15.0.0 | Run linters on staged files only |

**Development Workflow**:
```bash
npm run check       # Full suite: typecheck + lint + format + test
npm run test        # Run unit tests with vitest
npm run lint        # ESLint code quality checks
npm run format      # Prettier code formatting
npm run typecheck   # TypeScript type validation
```

### Engine Requirements
- **Node.js**: >= 18.0.0 (required for native `fetch()` API)

---

## Security Analysis

### ✅ Strengths

#### 1. Zero External Dependencies
- **No supply chain risk**: No third-party packages that could be compromised
- **No transitive vulnerabilities**: No risk from dependencies-of-dependencies
- **Audit simplicity**: Only ~800 lines of code to review

#### 2. Token Isolation
- **Environment variables**: Long-lived tokens stored in `HA_TOKEN` env var
- **Not in code**: No hardcoded credentials
- **Not in error messages**: Tokens never leaked in logs or errors

#### 3. Standard Authentication
- **Bearer token auth**: Uses HTTP `Authorization: Bearer <token>` header
- **Per-request auth**: Token sent with every request (stateless)

#### 4. Request Timeouts
- **Default 10-second timeout**: Prevents hanging requests
- **AbortController**: Modern timeout mechanism with cleanup
- **Configurable**: `HA_TIMEOUT_MS` env var for custom timeouts

#### 5. Type Safety
- **Full TypeScript coverage**: All types defined in `src/types.ts`
- **Compile-time checks**: Prevents type-related runtime errors
- **Type validation**: All HA REST API responses typed

#### 6. URL Sanitization
- **Trailing slash removal**: `baseUrl.replace(/\/+$/, "")` prevents malformed URLs
- **Base URL normalization**: Consistent URL construction

### ⚠️ Medium-Risk Issues

#### 1. Token Exposure in Plugin Configuration
**Location**: `homeassistant-plugin/index.ts` (lines 119-129)

```typescript
const pluginCfg = api.config?.plugins?.entries?.homeassistant?.config;
const resolvedConfig: HAConfig | undefined =
  pluginCfg?.base_url && pluginCfg?.token
    ? {
        baseUrl: pluginCfg.base_url.replace(/\/+$/, ""),
        token: pluginCfg.token,  // ← Token stored in plugin config
        timeoutMs: process.env.HA_TIMEOUT_MS
          ? parseInt(process.env.HA_TIMEOUT_MS, 10)
          : undefined,
      }
    : undefined;
```

**Issue**:
- Plugin config fields override env vars
- If config is logged, serialized, or cached, the token could be exposed
- Config files may be version-controlled or transmitted over insecure channels

**Impact**: Medium - Token exposure leads to unauthorized Home Assistant access

**Mitigation**:
- Remove `token` from plugin config schema (`openclaw.plugin.json`)
- Use environment variables exclusively
- Document that tokens are sensitive and should never be in config files

#### 2. JSON Parsing in Tool Parameters
**Location**: `homeassistant-plugin/index.ts` (lines 329-335, 496-501)

```typescript
if (params.service_data) {
  try {
    const extra = JSON.parse(params.service_data as string) as Record<string, unknown>;
    Object.assign(data, extra);
  } catch {
    return formatToolResult({ error: "Invalid JSON in service_data" });
  }
}
```

**Issue**: 
- Silent error handling on parse failure
- Could mask injection attempts or provide insufficient error context

**Status**: ✅ Already handled with try-catch and error reporting. Low risk.

#### 3. No Input Validation on URL Parameters
**Location**: `homeassistant-plugin/src/client.ts` (lines 158, 189)

```typescript
export async function getState(
  entityId: string,
  config?: HAConfig
): Promise<HAClientResult<EntityState>> {
  return request<EntityState>("GET", `/api/states/${entityId}`, undefined, config);
}
```

**Issue**:
- Entity IDs from untrusted sources could include path traversal (e.g., `../../admin`)
- No validation or sanitization of entity ID format

**Mitigation**: Home Assistant's REST API validates entity_id format server-side, but client-side validation would add defense-in-depth.

**Recommendation**: Add regex validation: `/^[a-z_]+\.[a-z0-9_]+$/i`

#### 4. No Request Rate Limiting
**Issue**: 
- Client allows unlimited concurrent requests
- Malicious AI agent could DDoS the Home Assistant instance
- No backoff or retry limits

**Impact**: Low-Medium - OpenClaw should implement rate limiting at the platform level

**Status**: Not addressed in this plugin (intentional design)

#### 5. Error Messages Leak HTTP Details
**Location**: `homeassistant-plugin/src/client.ts` (line 102)

```typescript
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
```

**Issue**: 
- Full HTTP response bodies returned to agents/tools
- Could expose server implementation details or internal paths

**Severity**: Low - Home Assistant typically sanitizes error responses, and this is useful for debugging.

### 🔴 High-Risk Issues

#### 1. Token Stored in Memory at Runtime
**Location**: `homeassistant-plugin/index.ts` (line 120)

```typescript
const resolvedConfig: HAConfig | undefined =
  pluginCfg?.base_url && pluginCfg?.token
    ? {
        baseUrl: pluginCfg.base_url.replace(/\/+$/, ""),
        token: pluginCfg.token,  // ← Stored plaintext in memory
        timeoutMs: process.env.HA_TIMEOUT_MS
          ? parseInt(process.env.HA_TIMEOUT_MS, 10)
          : undefined,
      }
    : undefined;
```

**Issue**:
- The resolved token is kept in plaintext memory throughout the plugin's lifetime
- If the OpenClaw process is compromised or memory is dumped, the token is recoverable
- Token remains in memory even if not actively used

**Impact**: High - Process memory compromise exposes long-lived access token

**Mitigation**:
- ✅ Use environment variables only (no plugin config for token)
- Consider implementing token refresh/rotation if Home Assistant supports it
- Store token in a secure credential manager (e.g., Node.js `crypto.subtle`)
- Clear token from memory when not in use (though Node.js GC limitations apply)

#### 2. No HTTPS Enforcement or Certificate Validation
**Location**: `homeassistant-plugin/src/client.ts` (line 69)

```typescript
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  config?: HAConfig
): Promise<HAClientResult<T>> {
  const cfg = config ?? getConfig();
  const url = `${cfg.baseUrl}${path}`;  // ← No HTTPS validation
  // ...
}
```

**Issue**:
- Plugin supports `http://` URLs without warning
- No validation that `HA_BASE_URL` uses HTTPS
- Network sniffing could expose tokens in transit

**Impact**: High - Man-in-the-middle attacks can steal tokens

**Proof of Concept**:
```bash
export HA_BASE_URL="http://homeassistant.local:8123"  # ← Insecure
export HA_TOKEN="eyJhb..."
# All requests sent over unencrypted HTTP
```

**Mitigation**:
```typescript
function getConfig(): HAConfig {
  const baseUrl = process.env.HA_BASE_URL;
  if (baseUrl && !baseUrl.startsWith('https://')) {
    throw new Error('HA_BASE_URL must use HTTPS in production');
  }
  // ...
}
```

**Alternative**: Allow HTTP only for `localhost` or `127.0.0.1`

#### 3. Service Call Data Not Validated
**Location**: `homeassistant-plugin/index.ts` (lines 326-344)

```typescript
async execute(_id: string, params: Record<string, unknown>): Promise<ToolResult> {
  const data: Record<string, unknown> = {};
  if (params.entity_id) data.entity_id = params.entity_id;

  if (params.service_data) {
    try {
      const extra = JSON.parse(params.service_data as string) as Record<string, unknown>;
      Object.assign(data, extra);  // ← No validation
    } catch {
      return formatToolResult({ error: "Invalid JSON in service_data" });
    }
  }

  const result = await callService(
    params.domain as string,
    params.service as string,
    data,  // ← Arbitrary data passed to HA
    undefined,
    resolvedConfig
  );
  // ...
}
```

**Issue**:
- AI agents can call any Home Assistant service with arbitrary data
- No allowlist or denylist for sensitive services
- Example attack: `automation.trigger` → execute automations, `script.reload` → reload scripts

**Impact**: Medium-High - This is by design (agents need full control), but could be abused

**Status**: **This is an application-level concern, not a plugin vulnerability**

**Mitigation** (if needed):
- Implement service allowlist/denylist at OpenClaw platform level
- Use Home Assistant's built-in user permissions (create a dedicated low-privilege user)
- Audit agent tool calls

### HTTP Client Security (`src/client.ts`)

#### Request Flow
1. Get config (env vars or explicit config)
2. Build Bearer token authorization header
3. Construct URL from base + path
4. Execute `fetch()` with timeout controller
5. Handle response (JSON or plain text)
6. Return result object with metadata

#### Security Features
- ✅ Bearer token in Authorization header (industry standard)
- ✅ AbortController timeout (prevents hanging)
- ✅ Content-type detection (handles plain text safely)
- ✅ Error handling without throwing exceptions

#### Security Gaps
- ❌ No HTTPS enforcement
- ❌ No certificate pinning (optional for private deployments)
- ❌ No retry logic (good for security - prevents replay attacks)
- ❌ No request signing or additional authentication

### Authentication & Credential Handling

#### Storage Hierarchy
1. **Primary**: Environment variables (`HA_BASE_URL`, `HA_TOKEN`)
2. **Secondary**: Plugin config object (less secure, not recommended)
3. **Fallback chain**: Plugin config → env vars → error

#### Best Practices Implemented
- ✅ Never log tokens (no `console.log` of config)
- ✅ No token in error messages
- ✅ Short-lived token recommendation implied in SECURITY.md

#### Recommendations
- ❌ Plugin should NOT accept tokens in config files
- ✅ Use environment variables exclusively for production
- ✅ Rotate tokens monthly (document in README)

### Plugin Configuration Schema Security

**File**: `homeassistant-plugin/openclaw.plugin.json`

```json
"configSchema": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "base_url": {
      "type": "string",
      "description": "Home Assistant base URL (overrides HA_BASE_URL env var)"
    },
    "token": {
      "type": "string",  // ← SECURITY CONCERN
      "description": "Long-lived access token (overrides HA_TOKEN env var)"
    }
  }
}
```

**Issues**:
- Schema allows plaintext tokens in config
- No "sensitive" flag or security warning
- UI hints don't indicate token is a secret

**Fix**: Remove `token` from schema, use env vars only

---

## Recommendations

### 🚨 Immediate (Critical)

#### 1. Remove Token from Plugin Config Schema
**File**: `homeassistant-plugin/openclaw.plugin.json`

**Current**:
```json
"properties": {
  "base_url": { "type": "string" },
  "token": { "type": "string" }  // ← Remove this
}
```

**Recommended**:
```json
"properties": {
  "base_url": { "type": "string" }
}
```

**Impact**: Prevents token storage in config files

#### 2. Document HTTPS Requirement
**File**: `README.md` (Configuration section)

**Add**:
```markdown
## Security Notice

⚠️ **Always use HTTPS in production**. Your `HA_BASE_URL` must start with `https://` to prevent token exposure over the network.

```bash
# ✅ Secure
export HA_BASE_URL="https://homeassistant.local:8123"

# ❌ Insecure - only for local testing
export HA_BASE_URL="http://localhost:8123"
```

#### 3. Add Base URL Validation
**File**: `homeassistant-plugin/src/client.ts`

**Current** (line 36):
```typescript
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
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token,
    timeoutMs: process.env.HA_TIMEOUT_MS ? parseInt(process.env.HA_TIMEOUT_MS, 10) : undefined,
  };
}
```

**Recommended**:
```typescript
function getConfig(): HAConfig {
  const baseUrl = process.env.HA_BASE_URL;
  const token = process.env.HA_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "Home Assistant configuration missing. " +
        "Set HA_BASE_URL and HA_TOKEN environment variables."
    );
  }

  // Validate HTTPS in production (allow HTTP only for localhost)
  const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  if (!baseUrl.startsWith('https://') && !isLocalhost) {
    throw new Error(
      "HA_BASE_URL must use HTTPS in production. " +
        "HTTP is only allowed for localhost/127.0.0.1."
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token,
    timeoutMs: process.env.HA_TIMEOUT_MS ? parseInt(process.env.HA_TIMEOUT_MS, 10) : undefined,
  };
}
```

### ⏱️ Short-term (Important)

#### 4. Implement Entity ID Validation
**File**: `homeassistant-plugin/src/client.ts`

Add validation function:
```typescript
function validateEntityId(entityId: string): boolean {
  // Home Assistant entity_id format: domain.object_id
  // domain: lowercase letters and underscores
  // object_id: lowercase letters, numbers, and underscores
  return /^[a-z_]+\.[a-z0-9_]+$/i.test(entityId);
}

export async function getState(
  entityId: string,
  config?: HAConfig
): Promise<HAClientResult<EntityState>> {
  if (!validateEntityId(entityId)) {
    return {
      ok: false,
      status: 400,
      data: undefined as unknown as EntityState,
      latencyMs: 0,
      error: `Invalid entity_id format: ${entityId}`,
    };
  }
  return request<EntityState>("GET", `/api/states/${entityId}`, undefined, config);
}
```

#### 5. Add Token Masking in Debug Logs
If debug logging is added:
```typescript
function logRequest(url: string, headers: Record<string, string>): void {
  const sanitizedHeaders = { ...headers };
  if (sanitizedHeaders.Authorization) {
    sanitizedHeaders.Authorization = 'Bearer [REDACTED]';
  }
  console.debug('Request:', url, sanitizedHeaders);
}
```

#### 6. Document Token Rotation Procedures
**File**: `SECURITY.md`

Add section:
```markdown
## Token Rotation

Home Assistant long-lived access tokens should be rotated regularly:

1. **Monthly rotation**: Create a new token and update `HA_TOKEN` env var
2. **Revoke old tokens**: Delete the old token in Home Assistant UI
3. **Monitor usage**: Check Home Assistant logs for unauthorized access
4. **Use dedicated tokens**: Create a token specifically for OpenClaw (don't share)

### Token Permissions

Create a dedicated Home Assistant user for OpenClaw with minimal permissions:
- Read-only access if possible
- Restrict to specific domains (e.g., only `light`, `switch`)
- Enable 2FA for the user account
```

### 🔄 Long-term (Enhancement)

#### 7. Support OAuth2/Token Refresh
If Home Assistant implements OAuth2 or token refresh:
- Implement automatic token refresh
- Store refresh tokens securely
- Handle token expiration gracefully

#### 8. Add Optional Certificate Pinning
For private Home Assistant deployments with self-signed certificates:
```typescript
interface HAConfig {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  certificateFingerprint?: string;  // SHA-256 fingerprint for pinning
}
```

#### 9. Implement Request Deduplication/Caching
For expensive calls (history, logbook):
- Cache responses for short periods (5-30 seconds)
- Deduplicate concurrent identical requests
- Add cache invalidation on state changes

#### 10. Add Audit Logging
Log which user/agent called what service:
```typescript
interface AuditLog {
  timestamp: string;
  userId: string;
  agentId: string;
  action: string;
  entityId: string;
  result: 'success' | 'error';
}
```

---

## Summary

### Risk Assessment Matrix

| Category | Status | Risk Level | Priority |
|----------|--------|-----------|----------|
| **Zero Dependencies** | ✅ | Critical (Good) | N/A |
| **Token in Plugin Config** | ❌ | High | 🚨 Immediate |
| **HTTPS Enforcement** | ❌ | High | 🚨 Immediate |
| **Token in Memory** | ⚠️ | High | ⏱️ Short-term |
| **Input Validation** | ⚠️ | Medium | ⏱️ Short-term |
| **Rate Limiting** | ❌ | Medium | 🔄 Long-term |
| **Error Message Leakage** | ⚠️ | Low | N/A |
| **Certificate Pinning** | ❌ | Low | 🔄 Long-term |
| **Type Safety** | ✅ | Low | N/A |
| **Unit Testing** | ✅ | Low | N/A |

### Overall Assessment

**This plugin is well-designed for its purpose** with a **minimal attack surface** due to zero external dependencies. The primary security concerns are:

1. **Token handling in plugin config** (High risk - immediate fix needed)
2. **Lack of HTTPS enforcement** (High risk - immediate fix needed)
3. **Token storage in memory** (Medium-High risk - architectural concern)

The code quality is **high**, with:
- ✅ Full TypeScript coverage
- ✅ Unit tests present
- ✅ Clean separation of concerns
- ✅ No external dependencies

**Recommendation**: **Approve for use** after implementing the **three immediate fixes** (remove token from config schema, document HTTPS requirement, add base URL validation). The plugin is suitable for production use with these changes.

### Final Score: 🟢 8.5/10

**Strengths**:
- Zero dependencies (supply chain security)
- Clean code architecture
- Comprehensive API coverage
- Good type safety

**Weaknesses**:
- Token handling needs hardening
- No HTTPS enforcement
- Limited input validation

---

**Document Version**: 1.0  
**Last Updated**: February 7, 2026  
**Next Review**: After implementing immediate fixes
