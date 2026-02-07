# OpenClaw Architecture: Gateway, Agents, Plugins, Skills, Nodes & Channels

This document maps the complete OpenClaw architecture — how each component relates to the others, and the full lifecycle of a message from arrival to reply.

## Components Overview

### Gateway

The **single, always-on daemon process**. It is the central hub — everything flows through it.

**What it owns:**

- All messaging channel connections (WhatsApp/Telegram/Discord/Slack/Signal/iMessage/etc.)
- The WebSocket control plane (port 18789) — operators, nodes, and web UI connect here
- Agent execution — agents run **embedded in the gateway process** via the pi-coding-agent SDK
- Plugin runtime — plugins are loaded **in-process** (not isolated)
- Tool policy enforcement, sandbox orchestration, session persistence
- Node discovery, pairing, and command routing
- HTTP APIs: `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`

**Key insight:** The gateway is not just a router. It is the *runtime* for agents, plugins, and tools. Everything executes inside this one process.

### Channels

**Messaging surfaces** that connect users to agents. Each channel is a platform integration that the gateway owns:

- WhatsApp (Baileys Web), Telegram (grammY), Discord (Bot API), Slack (Bolt), Signal (signal-cli), iMessage (BlueBubbles), Google Chat, MS Teams, Matrix, Nostr, LINE, Twitch, Zalo, and more
- Channels can also be **registered by plugins** (e.g., `@openclaw/voice-call`, `@openclaw/zalouser`)

**How they work:**

1. Message arrives on a channel
2. Gateway routes it to an agent via **session key** (format: `agent:<agentId>:<channel>:dm:<senderId>` or `agent:<agentId>:<channel>:group:<groupId>`)
3. Agent processes and replies
4. Reply is sent back to the **same channel deterministically** — the model never chooses which channel to use

**Security layers:** DM allowlists, pairing workflows (strangers get a code, operator approves), group allowlists, mention gating.

### Agents

An agent is an **isolated AI "brain"** with its own workspace, sessions, and auth. The gateway runs agents using pi-coding-agent embedded directly (via `createAgentSession()`).

**Each agent has:**

- A **workspace directory** (`~/.openclaw/workspace`) containing `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, and a `skills/` folder
- A **session store** (`~/.openclaw/agents/<agentId>/sessions/`) — JSONL transcripts
- **Auth profiles** — per-agent API key rotation with failover
- **Bootstrap files** — injected on first turn into the system prompt
- **Model + provider config** — which LLM to use, thinking level, timeout

**Multi-agent:** You can define multiple agents in `agents.list[]`. Inbound messages route to agents via **bindings** (most-specific match: peer > guild > account > channel > default agent).

### Nodes

**Companion devices** that connect to the gateway WebSocket with `role: "node"`. They expose a command surface via `node.invoke`. Nodes are **peripherals**, not gateways.

**Types:**

- **macOS nodes** — Canvas/WebView, camera, screen recording, `system.run`
- **iOS nodes** — Camera, location, SMS, audio
- **Android nodes** — Camera, location, SMS, audio
- **Headless node hosts** — Cross-platform (Linux/Windows), expose `system.run` and `system.which`

**What nodes provide:**

- `canvas.*` — Navigate URLs, evaluate JS, snapshots in a WebView
- `camera.snap` / `camera.clip` — Photos and video
- `screen.record` — Screen capture
- `location.get` — GPS coordinates
- `system.run` — Execute shell commands (with approval gating)

**Pairing:** Nodes use device-based pairing. Gateway is the source of truth. New devices require operator approval (`openclaw devices approve <requestId>`). Local connections can be auto-approved.

**Key insight for skills:** If the gateway is on Linux but a macOS node is connected with `system.run` allowed, OpenClaw can treat macOS-only skills as eligible when the required binaries exist on that node. The agent would execute those skills via the `nodes` tool (`nodes.run`).

### Plugins

**TypeScript modules loaded in-process with the gateway.** They are trusted code (no isolation).

**What plugins can register:**

- **Agent tools** — callable functions exposed to the model (required or optional)
- **Gateway RPC methods** — accessible via `openclaw gateway call <method>`
- **CLI commands** — `openclaw <command>`
- **Auto-reply commands** — slash commands that execute without invoking the agent
- **Channels** — new messaging surfaces
- **Provider auth** — OAuth/API key flows for model providers
- **Background services** — long-running processes
- **Plugin hooks** — event-driven automation
- **Skills** — via `"skills": [...]` in `openclaw.plugin.json`

**Lifecycle:** Discovered from config paths > workspace extensions > global extensions > bundled. Loaded at gateway startup. Config changes require restart.

### Skills

**Pure markdown files** (`SKILL.md`) that get **injected into the agent's system prompt**. They teach the agent what tools exist and how to use them.

**What a skill IS:**

- A directory containing `SKILL.md` with YAML frontmatter + markdown body
- Frontmatter: `name`, `description`, optional `metadata` (single-line JSON)
- Body: instructions, patterns, examples for using tools

**What a skill is NOT:**

- Executable code
- A tool implementation
- Something that "runs" on a node or gateway

**How skills get into the prompt:**

1. At session start, OpenClaw snapshots eligible skills
2. Eligibility is determined by **gating rules** in `metadata.openclaw.requires`:
   - `bins` — binaries must exist on `$PATH`
   - `env` — environment variables must be set
   - `config` — `openclaw.json` keys must be truthy
   - `os` — platform filter
3. Eligible skills are injected as a compact XML list into the system prompt
4. The agent reads the list and can `read` the full `SKILL.md` file for detailed instructions

**Where skills live (precedence):**

1. `<workspace>/skills` (highest — per-agent)
2. `~/.openclaw/skills` (shared across agents)
3. Bundled skills (shipped with OpenClaw)
4. `skills.load.extraDirs` (lowest)
5. Plugin-shipped skills (via `openclaw.plugin.json`)

**The binary question:** A skill can **require** binaries (`requires.bins`), but the skill itself doesn't execute them. The skill instructs the agent to use tools (like `exec` or `nodes.run`) that invoke those binaries. The gating just ensures the skill isn't shown to the agent if the required binaries aren't available.

### Tools

**Callable functions** that the agent can invoke during inference. They're presented to the model via both the system prompt text and structured function schemas.

**Registered by:**

- **Core OpenClaw** — `read`, `write`, `edit`, `exec`, `process`, `browser`, `canvas`, `nodes`, `message`, `cron`, `gateway`, `web_search`, `web_fetch`, `image`, `sessions_*`, `agents_list`
- **Plugins** — custom tools via `api.registerTool()`

**Policy filtering layers:**

1. `tools.profile` — base allowlist (`minimal`, `coding`, `messaging`, `full`)
2. `tools.byProvider` — per-provider restrictions
3. `tools.allow` / `tools.deny` — global allow/deny
4. `agents.list[].tools.*` — per-agent overrides
5. Sandbox policies

---

## The Complete Message Lifecycle

### Phase 1: Channel Intake

A message arrives on a channel adapter (WhatsApp/Telegram/Discord/etc.). The raw message contains body, sender, peer (DM or group), channel type, and account ID. The channel adapter **deduplicates** on `(channel, account, peer, messageId)` to prevent reprocessing on reconnect redeliveries.

### Phase 2: Session Key Resolution

Before anything else, the gateway computes a **session key** — this determines which conversation context handles the message. The format depends on DM vs group and the `session.dmScope` config:

- **DM (default)**: `agent:main:main` — all DMs collapse to one session
- **DM (per-peer)**: `agent:main:dm:+15555550123` — each sender gets their own
- **Group**: `agent:main:whatsapp:group:120363999@g.us`
- **Thread**: `agent:main:discord:channel:123456:thread:987654`

### Phase 3: Agent Routing via Bindings

The gateway determines **which agent** handles this session key. Bindings are evaluated most-specific-first:

1. Exact peer match (binding targets a specific phone number/user)
2. Guild match (Discord server)
3. Team match (Slack workspace)
4. Account match (which bot account on that channel)
5. Channel match (any account on that channel type)
6. Default agent (fallback)

If broadcast groups are configured, the same message can route to **multiple agents** in parallel.

### Phase 4: Inbound Debouncing

Optional. If `messages.inbound.debounceMs` is configured, rapid text messages from the same sender are **batched** into a single agent turn. Media/attachments and control commands flush immediately — they bypass debouncing.

### Phase 5: Message Body Preparation

The raw message is normalized:

- **Directives** (`/think`, `/verbose`, `/model`) are extracted and stripped before the model sees them
- **Group history** is wrapped with context markers: `[Chat messages since your last reply]` + `[Current message - respond to this]`
- The result is `Body` (what the model sees), `CommandBody` (raw text for command parsing)

### Phase 6: Command Validation (Pre-Agent)

**This is where plugins first come into play.** Before any agent is invoked:

1. **Plugin auto-reply commands** are checked first. If a plugin registered a command via `registerCommand()` and it matches, the plugin returns `{ text: "..." }` immediately. **No agent runs.** No LLM call. This is pure plugin code on the gateway.
2. **Built-in commands** (`/new`, `/reset`, `/stop`, `/queue`, `/context`) are processed.
3. **Inline directives** in the message text are stripped and applied as per-run settings.
4. **Routing rules** are enforced: mention gating in groups, DM allowlists, send policy.

If a command was handled, the flow ends here. Otherwise, it continues to queueing.

### Phase 7: Lane-Based Queueing

Messages are enqueued to **two lanes simultaneously**:

- **Session lane** (`session:<sessionKey>`, concurrency=1) — guarantees only one active run per session, preventing race conditions on the session JSONL file
- **Global lane** (`"main"`, concurrency=`agents.defaults.maxConcurrent`, default 4) — throttles overall parallelism across all sessions

Typing indicators fire immediately while waiting. Queue modes control what happens when messages pile up:

- `collect` (default): coalesce queued messages into one followup
- `steer`: inject into the current run mid-stream
- `followup`: wait for current run to finish, then start new one

### Phase 8: Gateway Hooks Fire (Commands)

If the message was a command (`/new`, `/reset`, etc.), **gateway hooks** fire now, *before* command execution. These are discovered from `<workspace>/hooks/`, `~/.openclaw/hooks/`, and bundled hooks.

Examples:

- `session-memory` hook: saves session context to `memory/` on `/new`
- `command-logger` hook: logs the command

Hook handlers receive an event with `type: "command"`, `action: "new"|"reset"|"stop"`, the session entry, workspace dir, and config.

### Phase 9: Session Management

The gateway looks up or creates the session:

- **Reset evaluation**: daily reset (default 4 AM), idle reset (optional sliding window), manual triggers
- **If reset needed**: generate new `sessionId`, create fresh JSONL transcript
- **If `/new` sent alone**: emit a greeting turn, queue the actual message as a followup

### Phase 10: Gateway RPC `agent()` Call

The gateway's internal `agent()` RPC method is called. This uses **two-stage acknowledgment**:

- **Stage 1** (immediate): `{ runId, status: "accepted", acceptedAt }` — message accepted, agent starting
- **Stage 2** (streaming): `event: "agent"` frames stream tool/assistant deltas, followed by final `{ runId, status: "ok"|"error", summary }`

### Phase 11: Agent Command Execution

Inside `agentCommand`, preparation happens:

1. **Model + defaults resolved** (per-agent overrides, thinking level)
2. **Skills snapshot loaded** — eligible skills discovered and cached
3. **Session opened** — `SessionManager` acquires write lock
4. **`agent:bootstrap` hook fires** (plugin hook) — plugins can mutate bootstrap files before injection
5. **`before_agent_start` hook fires** (plugin hook) — plugins can inject context or override the system prompt entirely

### Phase 12: System Prompt Assembly

Built **fresh every run** (never cached). Components in order:

1. Tooling list + tool schemas
2. Safety guardrails
3. Skills list (eligible skills as compact XML)
4. Workspace location
5. Documentation pointers
6. Project context (bootstrap files: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`)
7. Current date/time + runtime info
8. Reply tags, heartbeats, reasoning level
9. Sandbox info (if enabled)

### Phase 13: Embedded pi-agent-core Loop

The actual LLM inference loop runs embedded in the gateway process:

```
repeat:
  1. Call model with context + tools
  2. Stream assistant text deltas -> channel (if block streaming enabled)
  3. Parse tool calls from model output
  4. Plugin hook: before_tool_call -> can intercept/reject
  5. Execute tool (plugin tool or built-in)
  6. Sanitize result (trim output, encode media)
  7. Plugin hook: tool_result_persist (synchronous) -> can transform result
  8. Plugin hook: after_tool_call -> can inspect result
  9. Log tool call + result to JSONL transcript
  10. Stream tool result event
  11. Check queue for steered message (if steer mode)
until: model stops or timeout (600s default)
```

### Phase 14: Reply Shaping

After the agent loop completes:

- Collect assistant text blocks + optional reasoning
- Filter out `NO_REPLY` tokens and messaging tool duplicates
- Format per-channel (text length limits, prefixes/suffixes, threading)
- **Plugin hook: `agent_end`** — plugins inspect final messages + usage
- **Plugin hook: `message_sending`** — plugins can intercept/transform before send

### Phase 15: Message Delivery

The channel adapter sends the reply back:

- WhatsApp via Baileys, Telegram via grammY, Discord/Slack via their APIs
- Idempotency keys for safe retries (WhatsApp)
- **Plugin hook: `message_sent`** — plugins observe after successful delivery

### Phase 16: Session Persistence

- JSONL entries appended: assistant messages, tool results, lifecycle events
- `sessions.json` updated with `sessionId`, `updatedAt`, token counts
- Optional: auto-compaction if context window overflowed during the run

---

## Where Plugins and Hooks Participate

| Phase | Hook/Plugin Point | Type | Can Block? |
|-------|-------------------|------|-----------|
| 6 | `registerCommand()` auto-reply | Plugin | Yes — skips agent entirely |
| 8 | `command:*` events | Gateway hook | No — observes/mutates context |
| 11 | `agent:bootstrap` | Plugin hook | No — mutates bootstrap files |
| 11 | `before_agent_start` | Plugin hook | No — injects context/prompt |
| 13 | `before_tool_call` | Plugin hook | Yes — can reject tool call |
| 13 | `tool_result_persist` | Plugin hook (sync) | No — transforms result |
| 13 | `after_tool_call` | Plugin hook | No — observes |
| 14 | `agent_end` | Plugin hook | No — observes |
| 14 | `message_sending` | Plugin hook | Yes — can transform/block |
| 15 | `message_sent` | Plugin hook | No — observes |

---

## Visual Flow

```
User sends "turn on the living room lights" via WhatsApp
  |
  v
CHANNEL (WhatsApp/Baileys) receives message
  |
  v
SESSION KEY RESOLUTION
  |  Resolve scope: dmScope, group, channel, thread/topic
  |  Result: agent:main:whatsapp:dm:+15555550123
  |
  v
AGENT ROUTING (BINDINGS)
  |  Peer > Guild > Team > Account > Channel > Default
  |  Result: agentId = "main"
  |
  v
DEBOUNCING (optional)
  |  Batch rapid messages from same sender
  |
  v
MESSAGE BODY PREPARATION
  |  Normalize body, extract directives, inject history wrappers
  |
  v
COMMAND VALIDATION (pre-agent)
  |  Check plugin auto-reply commands -> if matched, return immediately
  |  Check built-in commands (/new, /reset, /stop)
  |  Enforce routing rules (allowlists, mention gating)
  |
  v
ENQUEUE TO SESSION + GLOBAL LANES
  |  session:<sessionKey> lane (concurrency=1)
  |  global "main" lane (concurrency=maxConcurrent)
  |  Typing indicators fire immediately
  |
  v
GATEWAY HOOKS (if command)
  |  Event: "command:new", "command:reset", etc.
  |  Examples: session-memory, command-logger
  |
  v
SESSION MANAGEMENT
  |  Lookup or create session for sessionKey
  |  Evaluate reset policy (daily/idle)
  |
  v
GATEWAY RPC: agent() method
  |  Stage 1: { runId, status: "accepted" }
  |  Stage 2: streaming events + final response
  |
  v
AGENT COMMAND EXECUTION
  |  Resolve model + defaults
  |  Load skills snapshot
  |  Open session, acquire write lock
  |  Hook: agent:bootstrap (plugins mutate bootstrap files)
  |  Hook: before_agent_start (plugins inject context)
  |
  v
SYSTEM PROMPT ASSEMBLY (fresh each run)
  |  Tooling, Safety, Skills, Workspace, Documentation
  |  Project Context (AGENTS.md, SOUL.md, etc.)
  |  Date/Time, Runtime, Reply Tags, Sandbox
  |
  v
EMBEDDED PI-AGENT LOOP
  |  1. Call model with context + tools
  |  2. Stream assistant deltas
  |  3. Parse tool calls
  |  4. Hook: before_tool_call (can reject)
  |  5. Execute tool (plugin or built-in)
  |  6. Hook: tool_result_persist (transform)
  |  7. Hook: after_tool_call (observe)
  |  8. Log to JSONL transcript
  |  9. Repeat until stop or timeout
  |
  v
REPLY SHAPING
  |  Collect text, filter NO_REPLY, format per-channel
  |  Hook: agent_end (observe)
  |  Hook: message_sending (can transform/block)
  |
  v
MESSAGE DELIVERY
  |  Channel adapter sends reply
  |  Hook: message_sent (observe)
  |
  v
SESSION PERSISTENCE
  |  Append JSONL, update sessions.json, record usage
  |  Optional: auto-compaction
  |
  v
FINAL RPC RESPONSE
     { runId, status: "ok"|"error", summary, usage }
```

---

## Summary Table

| Phase | What Happens | Who Decides | Where State Lives |
|-------|-------------|-------------|-------------------|
| **1. Arrival** | Message received from channel | Channel adapter | In-memory buffer |
| **2. Session Key** | Determine session scope (DM/group/thread) | `dmScope` config + peer info | Computed each time |
| **3. Agent Routing** | Select agent via bindings | Bindings config (most-specific match) | Config |
| **4. Debounce** | Batch rapid messages | `messages.inbound.debounceMs` | In-process queue |
| **5. Prep Body** | Normalize text, directives, history | Message normalization logic | In-memory |
| **6. Command Check** | Plugin auto-reply or built-in command | Plugin registry + command handlers | Config + memory |
| **7. Queue** | Enqueue to session + global lanes | Queue configuration + concurrency | In-process FIFO |
| **8. Command Hooks** | Fire gateway hooks (`/new`, `/reset`, `/stop`) | Hook registry (discovery + eligibility) | `~/.openclaw/hooks/` |
| **9. Session Mgmt** | Lookup/create session, evaluate reset | `session.reset` config | `~/.openclaw/agents/<id>/sessions/` |
| **10. RPC Call** | Gateway `agent()` method | Client request | RPC response |
| **11. Bootstrap** | Load + inject workspace files | `agent:bootstrap` hook + workspace files | `workspace/` + `~/.openclaw/` |
| **12. System Prompt** | Assemble fresh system prompt | OpenClaw core + plugins | Built in-memory per run |
| **13. Agent Loop** | Run pi-agent-core with tools | Model + tools + agent loop logic | JSONL transcript |
| **14. Tool Calls** | Execute tools, sanitize results | Tool schemas + `tool_result_persist` hook | Tool results in JSONL |
| **15. Reply Shape** | Format final replies per-channel | Channel config + agent output | Formatted payloads |
| **16. Send** | Deliver via channel adapter | Channel `outbound.sendText()` | Channel API |
| **17. Persist** | Write session transcript + metadata | `SessionManager` + store | JSONL + `sessions.json` |
