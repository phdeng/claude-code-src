// ================================================================
// Layer definitions
// ================================================================
export const LAYERS = [
  { id: 'entry',     label: 'ENTRY LAYER',        color: '#f97316', row: 0 },
  { id: 'ui',        label: 'UI LAYER',            color: '#60a5fa', row: 1 },
  { id: 'engine',    label: 'QUERY ENGINE',        color: '#a78bfa', row: 2 },
  { id: 'toolcmd',   label: 'TOOL / COMMAND',      color: '#34d399', row: 3 },
  { id: 'service',   label: 'SERVICE LAYER',       color: '#f472b6', row: 4 },
  { id: 'infra',     label: 'STATE / PERMISSION',  color: '#6ee7b7', row: 5 },
  { id: 'extension', label: 'EXTENSIONS',          color: '#818cf8', row: 6 },
]

export const LAYER_MAP = Object.fromEntries(LAYERS.map(l => [l.id, l]))

// ================================================================
// Nodes  –  gx = horizontal grid position (0..10)
// ================================================================
const COL_W = 200   // horizontal spacing per grid unit
const ROW_H = 160   // vertical spacing per layer row

export const RAW_NODES = [
  // ── Entry ──
  { id: 'cli',        label: 'cli.tsx',          layer: 'entry',     gx: 2,   desc: 'CLI entry point. 4 fast paths (zero module load): --version, --dump-system-prompt, --chrome-native-host, --daemon-worker. Standard path dynamically imports main.tsx for full boot.', files: ['src/entrypoints/cli.tsx'], input: 'CLI args: claude [opts] [prompt]', output: 'Parsed args → main.tsx' },
  { id: 'main',       label: 'main.tsx',         layer: 'entry',     gx: 4.5, desc: 'Main bootstrap (4600+ lines). 5 mode branches: Bridge / Daemon / MCP / Remote / Interactive. Parallel init: MDM + keychain + GrowthBook. Then setup() (Node check, Git root, 11 migrations, memory init, hooks, permissions) → init() (auth, MCP servers, plugins) → Ink render.', files: ['src/main.tsx'], input: 'Parsed CLI args + env', output: 'Initialized app → Ink' },
  { id: 'mcp_entry',  label: 'mcp.ts',           layer: 'entry',     gx: 7,   desc: 'MCP server entry. Starts Claude Code as a Model Context Protocol server exposing tools to external clients.', files: ['src/entrypoints/mcp.ts'], input: '--mcp flag', output: 'MCP server instance' },
  { id: 'sdk_entry',  label: 'agentSdkTypes.ts', layer: 'entry',     gx: 9,   desc: 'Agent SDK public types. Enables using Claude Code as a library from external code.', files: ['src/entrypoints/agentSdkTypes.ts'], input: 'SDK import', output: 'QueryEngine instance' },

  // ── UI ──
  { id: 'repl',       label: 'REPL.tsx',         layer: 'ui',        gx: 1.5, desc: 'Main interactive screen (895KB). 5 zones: header (model/cost), message list (virtual scroll), input (text/vim/paste), footer (shortcuts), overlays (permission dialog, settings, onboarding).', files: ['src/screens/REPL.tsx'], input: 'User keystrokes + paste', output: 'Rendered terminal UI' },
  { id: 'components', label: 'Components',       layer: 'ui',        gx: 4,   desc: '150+ React components. Business: MessageResponse, Markdown, ToolUseLoader, AgentProgressLine, CompactSummary. Design system: ThemedBox, Dialog, Pane, Tabs, ProgressBar, FuzzyPicker.', files: ['src/components/'], input: 'Props from REPL', output: 'Ink virtual DOM' },
  { id: 'hooks',      label: 'Hooks (96+)',      layer: 'ui',        gx: 6.5, desc: '96+ React Hooks in 4 categories. UI: useTextInput, useVimInput, useVirtualScroll. Data: useAssistantHistory, useMemoryUsage. Permission: useCanUseTool (40KB). Integration: useRemoteSession, useVoice, useScheduledTasks.', files: ['src/hooks/'], input: 'State subscriptions', output: 'Derived state + effects' },
  { id: 'ink',        label: 'Ink Framework',    layer: 'ui',        gx: 9,   desc: 'Custom Ink rendering engine. Primitives: Box, Text, ScrollBox, AlternateScreen, ANSI renderer, Spinner. Context chain: Theme → TermSize → Focus → Clock → Stdin → Cursor → Modal → Overlay.', files: ['src/ink/'], input: 'React virtual DOM', output: 'ANSI escape → terminal' },

  // ── Engine ──
  { id: 'queryEngine', label: 'QueryEngine',     layer: 'engine',    gx: 2.5, desc: 'Core class (1295 lines). submitMessage() → AsyncGenerator<SDKMessage>. System prompt building, tool call processing, history management. Hidden: speculative execution can pre-run queries while user types (Copy-on-Write overlay, read-only tools).', files: ['src/QueryEngine.ts'], input: 'User prompt + history', output: 'AsyncGenerator<SDKMessage>' },
  { id: 'query',       label: 'query.ts',        layer: 'engine',    gx: 5.5, desc: 'REPL conversation handler (1729 lines). Integrates permissions, tool execution feedback, and Ink rendering with QueryEngine.', files: ['src/query.ts'], input: 'User message from REPL', output: 'Rendered responses' },
  { id: 'context',     label: 'context.ts',      layer: 'engine',    gx: 8.5, desc: 'System/user context builder. Git status + CLAUDE.md + memory files (memdir/) + current date → system prompt. Memory scanning runs in parallel for relevant past context.', files: ['src/context.ts'], input: 'Project root + Git + memdir/', output: 'System prompt blocks' },

  // ── Tool & Command ──
  { id: 'toolDef',  label: 'Tool.ts',            layer: 'toolcmd',   gx: 0.5, desc: 'Tool type definition (792 lines). name, description, getInputSchema(), validateInput(), executeUnsafe(), isConcurrencySafe.', files: ['src/Tool.ts'], input: 'Tool interface', output: 'Type definitions' },
  { id: 'toolReg',  label: 'tools.ts',           layer: 'toolcmd',   gx: 2.2, desc: 'Tool registry (390 lines). getAllBaseTools() = single source of truth. getTools() filters. assembleToolPool() merges MCP tools.', files: ['src/tools.ts'], input: 'Permission + flags', output: 'Tool[] pool' },
  { id: 'tools',    label: 'Tools (43+)',        layer: 'toolcmd',   gx: 4,   desc: '43+ tools: BashTool, FileReadTool, FileEditTool, GlobTool, GrepTool, AgentTool, WebSearchTool, SkillTool, etc.', files: ['src/tools/'], input: 'Validated JSON input', output: 'ToolResult {content}' },
  { id: 'toolOrch', label: 'Orchestration',      layer: 'toolcmd',   gx: 5.8, desc: 'Execution orchestrator. Read queue (FileRead/Glob/Grep → concurrent, max 10) vs Write queue (Bash/FileEdit → serial). 4 hook stages: pre-tool, post-tool, pre-compact, post-compact. FileStateCache tracks file changes.', files: ['src/services/tools/toolOrchestration.ts'], input: 'ToolUseBlock[] from API', output: 'ToolResult[] → API' },
  { id: 'cmdReg',   label: 'commands.ts',        layer: 'toolcmd',   gx: 7.8, desc: 'Command registry (754 lines). 50+ slash commands from 7 sources (priority order): bundled skills → builtin plugin skills → skill dir → workflows → plugin commands → plugin skills → built-in. Parallel loading, memoized, filtered by availability.', files: ['src/commands.ts'], input: 'getCommands(cwd)', output: 'Sorted Command[]' },
  { id: 'skills',   label: 'Skills (16+)',       layer: 'toolcmd',   gx: 9.5, desc: '16+ built-in skills: batch, claudeApi, debug, loop, remember, simplify, verify. Loading cascade: bundled → .claude/skills/ → plugins → MCP. Two modes: inline (expand into conversation) or fork (spawn independent agent).', files: ['src/skills/'], input: '/skill-name [args]', output: 'ContentBlockParam[]' },

  // ── Service ──
  { id: 'api',       label: 'claude.ts API',     layer: 'service',   gx: 1,   desc: 'Claude API core (125KB). 6 modules: claude.ts (main), client.ts (SDK), errors.ts (classification), withRetry.ts (retry strategy), usage.ts (quota), bootstrap.ts. Handles normalization, tool schemas, thinking mode, prompt caching, streaming.', files: ['src/services/api/claude.ts'], input: 'Messages + tools + prompt', output: 'Stream<SDKMessage>' },
  { id: 'mcpClient', label: 'MCP Client',        layer: 'service',   gx: 3.2, desc: 'MCP client system. MCPConnectionManager handles 4 transports: stdio/SSE/HTTP/WebSocket. OAuth + XAA auth flows. Proxies tools, resources, and commands from external MCP servers into the tool pool.', files: ['src/services/mcp/'], input: 'MCP config from settings', output: 'Connected servers + tools' },
  { id: 'compact',   label: 'Compact',           layer: 'service',   gx: 5.2, desc: 'Conversation compression system. 5 modules: compact.ts, autoCompact.ts (threshold trigger), microCompact.ts (incremental), apiMicrocompact.ts, sessionMemory.ts. Message grouping preserves tool call boundaries.', files: ['src/services/compact/'], input: 'History > threshold', output: 'Compressed summary' },
  { id: 'analytics', label: 'Analytics',         layer: 'service',   gx: 7.2, desc: 'Event logging pipeline. Routes to: Datadog (metrics), first-party logger (events), GrowthBook (feature flags). Buffered queue at startup, sampling for high-volume events, PII protection via metadata scrubbing.', files: ['src/services/analytics/'], input: 'logEvent(name, props)', output: 'Events → Datadog + 1P' },
  { id: 'lsp',       label: 'LSP Service',       layer: 'service',   gx: 9.2, desc: 'Language Server Protocol integration. LSPClient manages server instances (TypeScript, Python). LSPDiagnosticRegistry tracks diagnostics. passiveFeedback.ts injects diagnostics as context without user action.', files: ['src/services/lsp/'], input: 'File changes', output: 'Diagnostics' },

  // ── State / Permission ──
  { id: 'state',       label: 'bootstrap/state', layer: 'infra',     gx: 1.5, desc: 'Global session state (1758 lines). 6 groups: session metadata (id, projectRoot, cwd), resource stats (totalCostUSD, APIDuration), model config, telemetry (meters, counters), agent state, feature flags (isInteractive, kairosActive).', files: ['src/bootstrap/state.ts'], input: 'Session init params', output: 'Global mutable state' },
  { id: 'appState',    label: 'AppStateStore',   layer: 'infra',     gx: 4.5, desc: 'Reactive application state (DeepImmutable pattern). 8 domains: settings (5 priority levels), tasks, MCP (clients/tools/resources), plugins, permissions context, remote session, coordinator state, UI preferences. onChange listeners fire on updates.', files: ['src/state/AppStateStore.ts'], input: 'setState(updater)', output: 'Immutable state + notify' },
  { id: 'permissions', label: 'Permissions',     layer: 'infra',     gx: 7.5, desc: '6-step decision chain: 1) forced decisions 2) deny rules (glob patterns) 3) allow rules 4) mode check (bypass→allow, auto→classifier, manual→ask) 5) user prompt (allow/always allow/deny) 6) denial tracking (prevents infinite loops).', files: ['src/utils/permissions/'], input: 'Tool name + input', output: 'allow | deny | ask' },

  // ── Extensions ──
  { id: 'bridge',      label: 'Bridge',          layer: 'extension', gx: 1,   desc: 'IDE integration bridge. useReplBridge (115KB) + bridgeApi + sessionRunner. Security: JWT auth, device trust, work secrets. Enables VS Code/JetBrains to control Claude Code remotely via WebSocket.', files: ['src/bridge/'], input: 'Bridge protocol msgs', output: 'Remote cmd execution' },
  { id: 'coordinator', label: 'Coordinator',     layer: 'extension', gx: 3.5, desc: 'Multi-agent coordination. Research → synthesize → delegate to worker agents via AgentTool → verify results. Workers can run in isolated git worktrees. Task notifications flow back async.', files: ['src/coordinator/'], input: 'Task decomposition', output: 'Multi-agent results' },
  { id: 'remote',      label: 'Remote',          layer: 'extension', gx: 6,   desc: 'Remote session management. RemoteSessionManager + WebSocket connection. sdkMessageAdapter translates messages. remotePermissionBridge proxies permission dialogs between local UI and remote execution.', files: ['src/remote/'], input: 'Remote URL', output: 'Proxied session I/O' },
  { id: 'voice',       label: 'Voice',           layer: 'extension', gx: 8.5, desc: 'Voice input. Audio capture, transcription, feeds into prompt pipeline.', files: ['src/voice/'], input: 'Audio stream', output: 'Transcribed text' },
]

// Convert to Vue Flow node format
export function buildNodes(locale) {
  const nodes = locale === 'zh' ? getLocalizedRawNodes('zh') : RAW_NODES
  const layers = locale === 'zh' ? getLocalizedLayers('zh') : LAYERS
  const layerMap = Object.fromEntries(layers.map(l => [l.id, l]))
  return nodes.map(n => {
    const layer = layerMap[n.layer] || LAYER_MAP[n.layer]
    return {
      id: n.id,
      type: 'arch',
      position: { x: n.gx * COL_W, y: layer.row * ROW_H },
      data: {
        id: n.id,
        label: n.label,
        layer: n.layer,
        color: layer.color,
        layerLabel: layer.label,
        desc: n.desc,
        files: n.files,
        input: n.input,
        output: n.output,
      },
    }
  })
}

// ================================================================
// Edges
// ================================================================
export const RAW_EDGES = [
  ['cli', 'main'], ['main', 'repl'], ['mcp_entry', 'mcpClient'], ['sdk_entry', 'queryEngine'],
  ['repl', 'query'], ['repl', 'hooks'], ['repl', 'components'], ['components', 'ink'],
  ['query', 'queryEngine'], ['queryEngine', 'api'], ['queryEngine', 'toolOrch'],
  ['queryEngine', 'context'], ['queryEngine', 'compact'],
  ['toolOrch', 'tools'], ['toolOrch', 'permissions'], ['toolReg', 'tools'], ['toolDef', 'toolReg'],
  ['cmdReg', 'skills'], ['api', 'state'], ['state', 'appState'],
  ['repl', 'bridge'], ['repl', 'remote'], ['queryEngine', 'coordinator'],
  ['mcpClient', 'appState'], ['tools', 'state'], ['appState', 'permissions'],
  ['queryEngine', 'analytics'], ['tools', 'lsp'],
]

export function buildEdges() {
  const nodeMap = Object.fromEntries(RAW_NODES.map(n => [n.id, n]))
  return RAW_EDGES.map(([source, target]) => {
    const sn = nodeMap[source], tn = nodeMap[target]
    const sx = sn.gx * COL_W, sy = LAYER_MAP[sn.layer].row * ROW_H
    const tx = tn.gx * COL_W, ty = LAYER_MAP[tn.layer].row * ROW_H
    const dx = tx - sx, dy = ty - sy

    let sourceHandle, targetHandle
    if (Math.abs(dy) >= Math.abs(dx)) {
      sourceHandle = dy >= 0 ? 'b-src' : 't-src'
      targetHandle = dy >= 0 ? 't-tgt' : 'b-tgt'
    } else {
      sourceHandle = dx >= 0 ? 'r-src' : 'l-src'
      targetHandle = dx >= 0 ? 'l-tgt' : 'r-tgt'
    }

    return {
      id: `e-${source}-${target}`,
      source,
      target,
      sourceHandle,
      targetHandle,
      type: 'animated-edge',
      data: { source, target },
    }
  })
}

// ================================================================
// Scenarios
// ================================================================
export const SCENARIOS = {
  prompt: {
    title: 'User Prompt → Response',
    related: ['tool', 'compact', 'startup'],
    steps: [
      { nodes: ['cli'], desc: 'User runs: claude "explain this code"', detail: 'CLI parses args, detects standard mode, loads main.tsx dynamically', code: 'await import("../main.js") — src/entrypoints/cli.tsx:295' },
      { nodes: ['main'], desc: 'main.tsx bootstraps application', detail: 'Parallel: MDM settings + keychain + GrowthBook. Then migrations (11), state init', code: 'Promise.all([ensureMdmSettingsLoaded, ...]) — src/main.tsx:914' },
      { nodes: ['repl', 'components', 'ink'], desc: 'REPL renders, user types prompt', detail: 'useTextInput captures keystrokes. Ink renders terminal UI via ANSI escape codes', code: 'for await (const event of query({...})) — src/screens/REPL.tsx:2793' },
      { nodes: ['query', 'queryEngine'], desc: 'query.ts hands off to QueryEngine', detail: 'processUserInput(): slash cmd check, attachment handling, UserMessage construction', code: 'await processUserInput({...}) — src/QueryEngine.ts:416' },
      { nodes: ['queryEngine', 'context'], desc: 'System prompt assembled (20 parts)', detail: 'Static: identity + tools + tone (cached). Dynamic: session guidance + memory + env + MCP instructions + CLAUDE.md. Split into global/org/dynamic cache scopes.', code: 'await fetchSystemPromptParts({...}) — src/QueryEngine.ts:292' },
      { nodes: ['api'], desc: 'Claude API called with streaming', detail: 'buildSystemPromptBlocks() splits prompt for caching. normalizeMessagesForAPI() + toolToAPISchema(). Returns AsyncGenerator<SDKMessage>', code: 'for await (const message of deps.callModel({...})) — src/query.ts:659' },
      { nodes: ['repl', 'components'], desc: 'Response streamed and rendered live', detail: 'MessageResponse renders text + code blocks with syntax highlighting in real-time', code: 'for await (const event of query({...})) — src/screens/REPL.tsx:2793' },
      { nodes: ['state', 'analytics'], desc: 'Cost tracked, analytics logged', detail: 'calculateUSDCost() → addToTotalCostState(). Token counts sent to Datadog', code: 'logQueryProfileReport() — src/screens/REPL.tsx:2852' },
    ],
    edges: [['cli', 'main'], ['main', 'repl'], ['repl', 'components'], ['components', 'ink'], ['repl', 'query'], ['query', 'queryEngine'], ['queryEngine', 'context'], ['queryEngine', 'api'], ['api', 'state'], ['queryEngine', 'analytics']],
  },

  command: {
    title: 'Slash Command /xxx',
    related: ['prompt', 'tool'],
    steps: [
      { nodes: ['repl'], desc: 'User types: /compact or /cost', detail: 'Input starts with "/" → routed to command detection path instead of model' },
      { nodes: ['cmdReg'], desc: 'commands.ts resolves the command', detail: 'getCommands(cwd) loads 7 sources in parallel (memoized): bundled skills → plugin skills → skill dir → workflows → plugins → built-in. findCommand() matches by name/alias.' },
      { nodes: ['skills'], desc: 'Skill loaded if skill-type command', detail: 'Loading cascade: bundled (16) → .claude/skills/ → plugins → MCP. Two execution modes: inline (expand into conversation) or fork (spawn independent agent). getPromptForCommand() generates ContentBlockParam[].' },
      { nodes: ['queryEngine', 'query'], desc: 'Prompt command → QueryEngine', detail: 'type:"prompt" → submit to model. type:"local" → execute fn directly. type:"local-jsx" → Ink render' },
      { nodes: ['api'], desc: 'API processes with skill context', detail: 'Skill content injected as user message block. Model sees full skill instructions.' },
      { nodes: ['repl', 'components'], desc: 'Result rendered to user', detail: 'Model response rendered. For local commands, output shown directly.' },
    ],
    edges: [['repl', 'query'], ['query', 'queryEngine'], ['cmdReg', 'skills'], ['queryEngine', 'api'], ['repl', 'components']],
  },

  tool: {
    title: 'Tool Execution Pipeline',
    related: ['permission', 'agentLoop', 'subagent'],
    steps: [
      { nodes: ['api'], desc: 'API returns tool_use blocks in stream', detail: 'Assistant message contains tool_use content blocks: {name, id, input} for each tool call', code: 'for await (const message of deps.callModel({...})) — src/query.ts:659' },
      { nodes: ['queryEngine'], desc: 'QueryEngine extracts tool calls', detail: 'processToolCalls() pulls ToolUseBlock[] from assistant message. Yields them for execution.', code: 'toolUseBlocks.push(...content.filter(c => c.type === "tool_use")) — src/query.ts:829' },
      { nodes: ['toolOrch'], desc: 'Orchestrator partitions by concurrency', detail: 'partitionToolCalls(): Read queue (FileRead/Glob/Grep/WebFetch → concurrent, max 10) vs Write queue (Bash/FileEdit/FileWrite → serial). Pre-tool hooks fire before execution.', code: 'runTools(toolUseBlocks, assistantMessages, canUseTool, ctx) — src/query.ts:1382' },
      { nodes: ['permissions'], desc: 'Permission check per tool call', detail: 'hasPermissionsToUseTool(): 1) forced? 2) deny rules 3) allow rules 4) mode (auto/manual/bypass)', code: 'canUseTool(toolName, toolInput) — src/services/tools/toolOrchestration.ts:22' },
      { nodes: ['tools'], desc: 'Tool.executeUnsafe() runs', detail: 'validateInput() first. Then executeUnsafe(input, context). File tools update FileStateCache. Post-tool hooks fire after execution.', code: 'tool.validateInput() → tool.call() — src/services/tools/toolOrchestration.ts' },
      { nodes: ['toolOrch', 'queryEngine'], desc: 'Results aggregated → sent back', detail: 'ToolResult[] collected. Sent as tool_result messages in next API turn. Agentic loop may continue with more tool calls.', code: 'runTools(toolUseBlocks, ...) — src/query.ts:1382' },
      { nodes: ['api'], desc: 'API continues with tool results', detail: 'Model sees tool outputs. May produce more text, or request more tool calls (agentic loop).', code: 'deps.callModel({messages: [...toolResults]}) — src/query.ts:659' },
      { nodes: ['state'], desc: 'State updated with results', detail: 'File state cache refreshed. totalLinesAdded/Removed. totalCostUSD updated.', code: 'addToTotalCostState() — src/screens/REPL.tsx:2852' },
    ],
    edges: [['queryEngine', 'api'], ['queryEngine', 'toolOrch'], ['toolOrch', 'permissions'], ['toolOrch', 'tools'], ['tools', 'state'], ['api', 'state']],
  },

  mcp: {
    title: 'MCP Tool Proxy Call',
    related: ['tool', 'permission', 'startup'],
    steps: [
      { nodes: ['api'], desc: 'Model calls mcp__server__toolName', detail: 'Tool name with mcp__ prefix = MCP proxy tool. Schema injected by assembleToolPool()' },
      { nodes: ['queryEngine', 'toolOrch'], desc: 'Routed through orchestration', detail: 'MCPTool found in merged tool pool. executeUnsafe() delegates to MCP client.' },
      { nodes: ['permissions'], desc: 'MCP permission check', detail: 'Same rules as built-in. deny:["mcp__server"] blocks entire server. Per-tool rules supported.' },
      { nodes: ['mcpClient'], desc: 'MCPConnectionManager calls server', detail: 'JSON-RPC: tools/call over stdio / SSE / HTTP / WebSocket. Timeout + error handling.' },
      { nodes: ['appState'], desc: 'MCP state in AppState', detail: 'AppState.mcp: clients[], tools[], commands[], resources[]. Connection status tracked.' },
      { nodes: ['queryEngine'], desc: 'Result proxied back to model', detail: 'CallToolResult → ToolResult → tool_result message. Standard tool output format.' },
    ],
    edges: [['queryEngine', 'api'], ['queryEngine', 'toolOrch'], ['toolOrch', 'permissions'], ['mcpClient', 'appState'], ['toolOrch', 'tools']],
  },

  startup: {
    title: 'Startup Sequence',
    related: ['prompt', 'mcp'],
    steps: [
      { nodes: ['cli'], desc: 'CLI entry: fast path check', detail: '4 fast paths (zero module load): --version, --dump-system-prompt, --chrome-native-host, --daemon-worker. Standard path → dynamic import main.tsx' },
      { nodes: ['main'], desc: 'Parallel initialization phase', detail: 'Phase 1 (parallel): MDM settings + keychain prefetch + GrowthBook flags. Phase 2: setup() — Node ≥18 check, Git root detection, 11 migrations, memory init, hooks, permissions. Phase 3: init() — auth, MCP servers, plugins.' },
      { nodes: ['state'], desc: 'bootstrap/state initialized', detail: '80+ fields: sessionId, projectRoot, cwd, modelUsage, counters, meters. Mutable singleton.' },
      { nodes: ['appState'], desc: 'AppStateStore from bootstrap', detail: 'Settings merged (5 priority levels). MCP config loaded. DeepImmutable pattern.' },
      { nodes: ['mcpClient'], desc: 'MCP servers connect in parallel', detail: 'Per server: config → auth (OAuth/XAA) → transport → tool/resource discovery → register' },
      { nodes: ['repl', 'ink'], desc: 'Ink renders REPL interface', detail: 'Context chain: Theme → TermSize → Focus → Clock → Stdin → Cursor → Modal → Overlay' },
    ],
    edges: [['cli', 'main'], ['main', 'repl'], ['state', 'appState'], ['mcpClient', 'appState'], ['repl', 'components'], ['components', 'ink']],
  },

  permission: {
    title: 'Permission Decision Flow',
    related: ['tool', 'mcp'],
    steps: [
      { nodes: ['toolOrch'], desc: 'Tool call triggers permission check', detail: 'Before any executeUnsafe(), hasPermissionsToUseTool() is called with tool name + input' },
      { nodes: ['permissions'], desc: 'Step 1-2: Forced decisions, deny rules', detail: 'Forced decisions override all. deny: ["ToolName"] and deny: ["Bash(rm *)"] checked.' },
      { nodes: ['permissions', 'appState'], desc: 'Step 3-4: Allow rules, mode check', detail: 'allow: ["Bash(git *)"] patterns. mode: bypass→allow, auto→classifier, manual→ask.' },
      { nodes: ['repl', 'hooks'], desc: 'If "ask": permission dialog shown', detail: 'useCanUseTool (40KB) renders prompt. Options: Allow / Always allow / Deny' },
      { nodes: ['permissions'], desc: 'User decision applied', detail: 'Always allow → rule saved. Deny → tracked in denialTracking.ts (prevents loops)' },
      { nodes: ['tools'], desc: 'Tool executes or is rejected', detail: 'Allow → executeUnsafe() proceeds. Deny → error to model. Model may try alternative.' },
    ],
    edges: [['toolOrch', 'permissions'], ['appState', 'permissions'], ['repl', 'hooks'], ['toolOrch', 'tools']],
  },

  compact: {
    title: 'Context Compaction',
    related: ['prompt', 'agentLoop'],
    steps: [
      { nodes: ['queryEngine'], desc: 'Token count exceeds threshold', detail: 'After each API turn, QueryEngine checks total tokens. Threshold triggers auto-compact.' },
      { nodes: ['compact'], desc: 'Compact service summarizes history', detail: 'Three modes: full (complete summary), micro (key facts only), apiMicro (API-optimized).' },
      { nodes: ['api'], desc: 'Summary sent to Claude API', detail: 'Compressed history replaces original messages. System prompt preserved. Tools re-attached.' },
      { nodes: ['queryEngine'], desc: 'New shorter context continues', detail: 'Token count drops. Conversation resumes with summarized context. User sees "[compacted]".' },
      { nodes: ['state'], desc: 'Usage metrics updated', detail: 'compactCount++, tokensSaved tracked. Cost recalculated with shorter context.' },
    ],
    edges: [['queryEngine', 'compact'], ['queryEngine', 'api'], ['api', 'state']],
  },

  subagent: {
    title: 'Subagent Dispatch',
    related: ['tool', 'agentLoop'],
    steps: [
      { nodes: ['api'], desc: 'Model decides to spawn a subagent', detail: 'Assistant calls AgentTool with description, prompt, subagent_type (general-purpose, Explore, Plan, etc.)' },
      { nodes: ['queryEngine', 'toolOrch'], desc: 'AgentTool routed through orchestration', detail: 'AgentTool is a regular tool. Orchestrated serially (write queue). Permission check before execution.' },
      { nodes: ['permissions'], desc: 'Agent permission verified', detail: 'getDenyRuleForAgent() checks deny rules. subagent_type validated against built-in agent definitions.' },
      { nodes: ['tools'], desc: 'AgentTool creates subagent context', detail: 'Agent definition selected from: plugins > user agents > project agents > built-in. System prompt generated. MCP servers initialized.' },
      { nodes: ['queryEngine', 'api'], desc: 'Subagent runs its own query loop', detail: 'runAgent() creates independent QueryEngine. Subagent calls Claude API with its own system prompt. Can use tools (except nested Agent in some types).' },
      { nodes: ['tools', 'state'], desc: 'Subagent executes tools independently', detail: 'Subagent has own tool loop. Reads/writes files, runs bash. Token usage and cost tracked separately then merged to parent.' },
      { nodes: ['queryEngine'], desc: 'Result returned to parent model', detail: 'Sync: blocks until subagent completes. Async: returns immediately, <task-notification> injected when done.' },
    ],
    edges: [['queryEngine', 'api'], ['queryEngine', 'toolOrch'], ['toolOrch', 'permissions'], ['toolOrch', 'tools'], ['tools', 'state']],
  },

  agentLoop: {
    title: 'Agentic Tool Loop',
    related: ['tool', 'compact', 'subagent'],
    steps: [
      { nodes: ['repl'], desc: 'User sends complex task', detail: '"Fix the failing test in auth.ts" — requires reading, editing, running tests iteratively.' },
      { nodes: ['query', 'queryEngine'], desc: 'Query submitted to model', detail: 'User message + system prompt + tool schemas sent. Model decides what tools to call.' },
      { nodes: ['api'], desc: 'Model responds with tool calls', detail: 'Assistant message contains tool_use blocks: FileRead, then FileEdit, then Bash(npm test).' },
      { nodes: ['toolOrch', 'tools'], desc: 'Tools execute in parallel/serial', detail: 'Read queue (FileRead/Glob/Grep → concurrent, max 10). Write queue (Bash/FileEdit → serial). Pre/post hooks fire. FileStateCache updated.' },
      { nodes: ['queryEngine', 'api'], desc: 'Results fed back → model decides next', detail: 'Tool results become tool_result messages. Model may call more tools or produce final answer. Token count checked for auto-compact threshold.' },
      { nodes: ['toolOrch', 'tools'], desc: 'More tools if needed (loop continues)', detail: 'Model reads test output, edits code again, re-runs test. Loop repeats until model produces text-only response (no tool_use blocks).' },
      { nodes: ['api'], desc: 'Model produces final text response', detail: 'No more tool_use blocks — model outputs text summary of what it did and results.' },
      { nodes: ['repl', 'components'], desc: 'Response rendered to user', detail: 'Markdown, code blocks, diffs rendered. Cost and token usage displayed.' },
    ],
    edges: [['repl', 'query'], ['query', 'queryEngine'], ['queryEngine', 'api'], ['queryEngine', 'toolOrch'], ['toolOrch', 'tools'], ['repl', 'components']],
  },

  queryEngineFlow: {
    title: 'QueryEngine Deep Dive',
    related: ['prompt', 'tool', 'compact'],
    steps: [
      { nodes: ['query'], desc: 'query.ts receives user message', detail: 'REPL calls processUserInput(). Slash command detection, attachment handling, UserMessage construction. Message pushed to mutableMessages array.', code: 'yield* engine.submitMessage(prompt, {...}) — src/QueryEngine.ts:1288' },
      { nodes: ['queryEngine', 'context'], desc: 'submitMessage() builds system prompt', detail: 'fetchSystemPromptParts() runs 3 fetches in parallel: getSystemPrompt() (tools + capabilities), getUserContext() (date + memory), getSystemContext() (Git status). Combined into unified prompt.', code: 'await fetchSystemPromptParts({...}) — src/QueryEngine.ts:292' },
      { nodes: ['queryEngine'], desc: 'queryLoop() enters agentic while(true)', detail: 'Initialize loop state: messages, toolUseContext, autoCompactTracking, turnCount. buildQueryConfig() snapshots env once. Loop runs until no tool calls or max turns.', code: 'yield* queryLoop(state, deps) — src/query.ts:241' },
      { nodes: ['queryEngine', 'compact'], desc: 'Message compression pipeline', detail: '3-stage compression: 1) snipCompactIfNeeded() removes redundant history, 2) microcompact() cache-aware prompt compression, 3) autocompact() full summarization if tokens exceed threshold (forks agent).', code: 'await deps.microcompact(messages) — src/query.ts:414 → await deps.autocompact(messages) — src/query.ts:454' },
      { nodes: ['queryEngine', 'api'], desc: 'Build API request + call model', detail: 'normalizeMessagesForAPI() strips internal fields. toolToAPISchema() converts tools. appendSystemContext() injects Git status. Streams response as AsyncGenerator yielding text/thinking/tool_use blocks.', code: 'for await (const message of deps.callModel({...})) — src/query.ts:659' },
      { nodes: ['api'], desc: 'Stream response, collect tool_use blocks', detail: 'Content blocks arrive incrementally: text blocks rendered live, thinking blocks logged, tool_use blocks collected into toolUseBlocks[]. Sets needsFollowUp=true if any tools found.', code: 'toolUseBlocks.push(...filter(c => c.type === "tool_use")) — src/query.ts:829' },
      { nodes: ['queryEngine'], desc: 'No tools? Recovery checks before exit', detail: '4 recovery paths: A) 413 prompt-too-long → collapse drain or reactive compact, B) max output tokens → escalate to 64k or inject continuation nudge (3 retries), C) stop hooks → user callbacks, D) token budget → inject nudge. Otherwise exit.', code: 'if (!needsFollowUp) { /* 4 recovery paths */ } — src/query.ts:1062' },
      { nodes: ['toolOrch', 'permissions'], desc: 'Tool execution: partition + permission', detail: 'partitionToolCalls() splits: Read queue (FileRead/Glob/Grep → concurrent max 10) vs Write queue (Bash/FileEdit → serial). Each tool checked via hasPermissionsToUseTool() before execution.', code: 'runTools(toolUseBlocks, assistantMsgs, canUseTool, ctx) — src/query.ts:1382' },
      { nodes: ['tools'], desc: 'Tools run, results collected', detail: 'validateInput() → executeUnsafe(input, context). FileStateCache updated. StreamingToolExecutor runs tools during API streaming for parallelism. generateToolUseSummary() condenses via Haiku (async).', code: 'streamingToolExecutor.getRemainingResults() — src/query.ts:1370' },
      { nodes: ['queryEngine'], desc: 'Collect attachments for next turn', detail: 'Gather: memory prefetch results, skill discovery, file change notifications, task notifications, queued commands. Refresh MCP tools if new servers connected. Build next state with accumulated messages.', code: 'getAttachmentMessages() + getCommandsByMaxPriority() — src/query.ts:1546' },
      { nodes: ['queryEngine', 'api'], desc: 'Loop continues → back to compression', detail: 'turnCount++. Messages = [...previous, ...assistant, ...toolResults, ...attachments]. If turnCount > maxTurns → exit with error. Otherwise goto step 4 (compression) with expanded context.', code: 'state = {...state, messages: [...accumulated], turnCount: turnCount + 1} — src/query.ts:1704' },
      { nodes: ['query', 'state'], desc: 'Exit: persist transcript + update cost', detail: 'recordTranscript() saves to disk. calculateUSDCost() computes total. addToTotalCostState() updates counters. totalLinesAdded/Removed tracked. Analytics events emitted.', code: 'return { reason: "completed" } — src/query.ts:1192' },
    ],
    edges: [['query', 'queryEngine'], ['queryEngine', 'context'], ['queryEngine', 'compact'], ['queryEngine', 'api'], ['queryEngine', 'toolOrch'], ['toolOrch', 'permissions'], ['toolOrch', 'tools'], ['tools', 'state'], ['api', 'state']],
  },

  agentTeam: {
    title: 'Agent Team Collaboration',
    related: ['subagent', 'agentLoop', 'tool'],
    steps: [
      { nodes: ['repl'], desc: 'User requests complex multi-part task', detail: '"Refactor the auth system" — too large for one agent. Team Lead (main Claude session) decides to form a team.', code: 'TeamCreateTool — src/tools/TeamCreateTool/' },
      { nodes: ['queryEngine', 'api'], desc: 'Team Lead plans and creates team', detail: 'TeamCreate({team_name, description}) → ~/.claude/teams/{name}/config.json + task dir. Lead = team-lead@{name}. Config stores members[], teamAllowedPaths[].', code: 'TeamCreate() → config.json: {name, leadAgentId, members[], createdAt}' },
      { nodes: ['tools', 'appState'], desc: 'Task graph with blockedBy dependencies', detail: 'TaskCreate({subject, description}) for each sub-task. TaskUpdate({addBlockedBy: [id]}) sets DAG. State machine: pending → in_progress → completed. Tasks in AppState.tasks Map.', code: 'TaskCreate/TaskUpdate — src/tools/TaskCreateTool/' },
      { nodes: ['tools'], desc: 'Spawn teammates (3 backend options)', detail: 'Agent({name, team_name, subagent_type}). Backends: 1) In-Process (AsyncLocalStorage isolation, same process) 2) Tmux (independent pane) 3) iTerm2 (native split). Each gets color + agentId@team.', code: 'spawnTeammate() → backend: in-process | tmux | iterm2' },
      { nodes: ['tools', 'appState'], desc: 'File-based mailbox communication', detail: 'SendMessage({to, message}) writes to ~/.claude/teams/{name}/mailbox/{recipient}. Recipient polls mailbox. Supports: plain text, shutdown_request, shutdown_response, plan_approval_response.', code: 'SendMessage → write mailbox/{to} → recipient reads on idle' },
      { nodes: ['queryEngine', 'tools'], desc: 'Lead → Teammate: assign + message', detail: 'TaskUpdate({taskId, owner: "researcher"}). SendMessage({to: "researcher@team", message: "Start task #1"}). Lead can also SendMessage to continue existing teammate context.', code: 'Lead uses: Agent(new) / SendMessage(continue) / TaskStop(cancel)' },
      { nodes: ['api', 'tools'], desc: 'Teammate ↔ Teammate: peer messaging', detail: 'Teammates communicate directly: SendMessage({to: "implementer@team", ...}). No Lead relay needed. UDS (Unix Domain Socket) for local sessions, Bridge protocol for remote. Lead sees peer DM summaries in idle notifications.', code: 'P2P: SendMessage({to: "peer@team"}) → mailbox. Cross-session: uds:/path or bridge:session_id' },
      { nodes: ['api', 'tools'], desc: 'Teammates work: own QueryEngine + tools', detail: 'Each teammate has independent QueryEngine + API loop. Can read/write files, run Bash, use MCP tools. Token usage tracked separately. Teammates enter "idle" state when waiting — this is normal, not "done".', code: 'Each teammate: own submitMessage() loop, own tool permissions' },
      { nodes: ['tools', 'appState'], desc: 'Task status flow + auto-unblock', detail: 'TaskUpdate({status: "completed"}) → blocked tasks check blockedBy[]. All deps done → auto-unblock. Lead gets task change notifications during idle. Can reassign or create follow-up tasks.', code: 'State: pending → in_progress → completed. blockedBy[] auto-resolves' },
      { nodes: ['queryEngine'], desc: 'Lead synthesizes all results', detail: 'Lead receives completion messages from teammates. Reads outputs, may start new work phases. Final verification before reporting to user.', code: 'Lead aggregates: teammate messages + task statuses + file changes' },
      { nodes: ['tools'], desc: 'Shutdown: request → response → delete', detail: 'SendMessage({type: "shutdown_request"}) → teammate responds {type: "shutdown_response", approve: true/false}. If rejected, teammate continues. After all approved, TeamDelete() cleans config + task files.', code: 'shutdown_request → approve/reject → TeamDelete()' },
      { nodes: ['repl', 'state'], desc: 'Final result + cost aggregation', detail: 'Lead reports summary. Costs merged from all teammates into totalCostUSD. Team artifacts (code, docs) persist. Session can be resumed if team not deleted.', code: 'Cost: sum(teammate.tokenUsage) → parent.totalCostUSD' },
    ],
    edges: [['repl', 'query'], ['query', 'queryEngine'], ['queryEngine', 'api'], ['queryEngine', 'toolOrch'], ['toolOrch', 'tools'], ['tools', 'state'], ['appState', 'permissions']],
  },
}

// ================================================================
// Locale-aware getters
// ================================================================
import * as archZh from '../i18n/arch-zh.js'

export function getLocalizedLayers(locale) {
  if (locale !== 'zh') return LAYERS
  return LAYERS.map(l => ({ ...l, label: archZh.LAYER_LABELS[l.id] ?? l.label }))
}

export function getLocalizedNode(node, locale) {
  if (locale !== 'zh') return node
  const io = archZh.NODE_IO[node.id]
  return {
    ...node,
    label: archZh.NODE_LABELS[node.id] ?? node.label,
    desc: archZh.NODE_DESCS[node.id] ?? node.desc,
    input: io?.input ?? node.input,
    output: io?.output ?? node.output,
  }
}

export function getLocalizedRawNodes(locale) {
  if (locale !== 'zh') return RAW_NODES
  return RAW_NODES.map(n => getLocalizedNode(n, locale))
}

export function getLocalizedScenario(id, scenario, locale) {
  if (locale !== 'zh') return scenario
  const title = archZh.SCENARIO_TITLES[id] ?? scenario.title
  const zhSteps = archZh.SCENARIO_STEPS[id]
  const steps = zhSteps
    ? scenario.steps.map((s, i) => ({ ...s, desc: zhSteps[i]?.desc ?? s.desc, detail: zhSteps[i]?.detail ?? s.detail }))
    : scenario.steps
  return { ...scenario, title, steps }
}

export function getLocalizedScenarios(locale) {
  if (locale !== 'zh') return SCENARIOS
  const result = {}
  for (const [id, s] of Object.entries(SCENARIOS)) {
    result[id] = getLocalizedScenario(id, s, locale)
  }
  return result
}
