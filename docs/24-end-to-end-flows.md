# 24 - 端到端数据流分析

> 7 个跨模块的完整用户流程追踪，将之前分散在各文档中的 125+ 场景串联成完整链路。

---

## 总览：核心数据通路

```mermaid
graph TD
    USER["用户按键"] --> INPUT["processUserInput()"]
    INPUT --> QUERY["query() 主循环"]
    QUERY --> API["claude.ts API 调用"]
    API --> STREAM["流式响应"]
    STREAM --> TOOL{"工具调用?"}

    TOOL -->|是| PERM["权限检查"]
    PERM --> ORCH["toolOrchestration 分区"]
    ORCH --> EXEC["工具执行"]
    EXEC --> RESULT["工具结果"]
    RESULT --> QUERY

    TOOL -->|否| RENDER["Ink 渲染输出"]

    QUERY --> COMPACT{"tokens 超阈值?"}
    COMPACT -->|是| AUTO_COMPACT["自动压缩"]
    AUTO_COMPACT --> QUERY

    subgraph 持久化["持久化"]
        LOG["sessionStorage<br/>JSONL transcript"]
        COST_T["cost-tracker<br/>费用累计"]
        FILE_H["fileHistory<br/>文件快照"]
        MEMORY["memdir<br/>记忆提取"]
    end

    QUERY --> LOG & COST_T
    EXEC --> FILE_H
    QUERY --> MEMORY

    style QUERY fill:#f9f,stroke:#333
```

---

## 流程 1：用户输入 → 模型响应

```mermaid
sequenceDiagram
    participant K as 键盘
    participant TI as useTextInput
    participant PUI as processUserInput
    participant Q as query()
    participant API as claude.ts
    participant Orch as toolOrchestration
    participant Tool as 具体工具
    participant Ink as Ink 渲染

    K->>TI: 按键事件
    TI->>TI: onChange → 更新输入框
    TI->>PUI: onSubmit → 提交

    PUI->>PUI: 斜杠命令? → 路由到命令
    PUI->>PUI: Shell 语法 (!`cmd`) → 预执行
    PUI->>PUI: 创建 UserMessage + Attachment

    PUI->>Q: messages[], systemPrompt
    
    Q->>Q: normalizeMessagesForAPI()
    Q->>Q: toolToAPISchema()
    Q->>Q: appendSystemContext()
    Q->>Q: prependUserContext()
    
    Q->>API: anthropic.beta.messages.stream()

    loop 流式响应
        API-->>Q: text_delta / tool_use
        Q-->>Ink: yield SDKMessage (文本块)
        
        alt 包含 tool_use
            Q->>Orch: runTools(toolUseBlocks)
            Orch->>Orch: 分区: 读并发 / 写串行
            
            par 只读工具 (最多 10 个)
                Orch->>Tool: FileRead / Glob / Grep
            end
            Orch->>Tool: FileEdit / Bash (串行)
            
            Tool-->>Orch: ToolResult[]
            Orch-->>Q: 工具结果
            Q->>API: 发送 tool_result, 继续
        end
    end

    Q-->>Ink: 对话结束
    Ink->>Ink: 渲染到终端
```

### 关键数据结构

```
Message = UserMessage | AssistantMessage | SystemMessage
        | ProgressMessage | AttachmentMessage

ProcessUserInputResult = {
  messages: Message[]
  shouldQuery: boolean
  model?: string
  effort?: EffortValue
}

ToolUseBlock = {
  type: "tool_use"
  id: string
  name: string
  input: Record<string, unknown>
}
```

---

## 流程 2：Auto Mode 权限决策

```mermaid
flowchart TD
    MODEL["模型: Bash('rm -rf /')"] --> EXEC["runToolUse()"]
    EXEC --> CAN["canUseTool()"]

    CAN --> DENY_RULE{"全局 deny 规则?"}
    DENY_RULE -->|匹配| DENY["立即拒绝"]
    DENY_RULE -->|否| ASK_RULE{"ask 规则?"}
    ASK_RULE -->|匹配| PROMPT_USER["显示权限对话"]

    ASK_RULE -->|否| TOOL_CHECK["tool.checkPermissions()"]
    TOOL_CHECK --> BASH_CLASS["bashClassifier.ts<br/>语义分析命令"]
    BASH_CLASS --> DANGER["dangerousPatterns.ts<br/>危险模式检测"]

    DANGER --> MODE{"权限模式?"}
    MODE -->|"auto"| CLASSIFIER["classifierDecision.ts"]

    CLASSIFIER --> CONFIDENCE{"分类器信心?"}
    CONFIDENCE -->|"高: 安全"| ALLOW["允许执行"]
    CONFIDENCE -->|"高: 危险"| DENY
    CONFIDENCE -->|"低: 不确定"| FALLBACK["降级到 ask"]

    FALLBACK --> PROMPT_USER

    MODE -->|"manual"| PROMPT_USER
    MODE -->|"bypass"| ALLOW

    DENY --> TRACK["denialTracking"]
    TRACK --> CONSECUTIVE{"连续拒绝 ≥ 3?"}
    CONSECUTIVE -->|是| GLOBAL_FALLBACK["全局降级到 ask"]
    CONSECUTIVE -->|否| TOTAL{"累计拒绝 ≥ 20?"}
    TOTAL -->|是| RESTRICT["强化工具限制"]

    ALLOW --> HOOK["执行 PreToolUse Hook"]
    HOOK --> RUN["工具执行"]

    style DENY fill:#fdd
    style ALLOW fill:#dfd
    style FALLBACK fill:#ffd
```

---

## 流程 3：MCP 工具调用

```mermaid
sequenceDiagram
    participant Model as Claude 模型
    participant Orch as toolOrchestration
    participant MCPTool as MCPTool (代理)
    participant Client as MCP Client
    participant Transport as 传输层
    participant Server as MCP 服务器

    Model->>Orch: tool_use: mcp__github__search_repos

    Orch->>MCPTool: call(input)
    MCPTool->>MCPTool: 解析 serverName + toolName

    MCPTool->>Client: callTool(toolName, input)

    Client->>Transport: JSON-RPC 请求
    Note over Transport: stdio | sse | http | ws

    alt 需要认证
        Transport->>Transport: OAuth token 注入
        Transport->>Transport: 401 → handleOAuth401Error()
    end

    Transport->>Server: CallToolRequest
    Server-->>Transport: CallToolResult

    Transport-->>Client: 原始结果

    Client->>Client: 验证 & 截断
    Note over Client: mcpContentNeedsTruncation()
    
    alt 二进制/超大内容
        Client->>Client: persistBinaryContent()
        Client-->>MCPTool: 文件路径引用
    else 正常内容
        Client-->>MCPTool: 文本结果
    end

    MCPTool-->>Orch: ToolResult
    Orch-->>Model: tool_result
```

---

## 流程 4：会话恢复 (/resume)

```mermaid
sequenceDiagram
    participant User as 用户
    participant Cmd as /resume 命令
    participant Storage as sessionStorage
    participant Recovery as conversationRecovery
    participant State as bootstrap/state
    participant REPL as REPL

    User->>Cmd: /resume [关键词]

    Cmd->>Storage: loadSameRepoMessageLogs()
    Storage->>Storage: 遍历 ~/.claude/logs/{project}/
    Storage->>Storage: parseMessageLogs()
    Storage-->>Cmd: 可恢复的会话列表

    Cmd->>User: 显示会话选择器
    User-->>Cmd: 选择 sessionId

    Cmd->>Storage: loadFullLog(sessionId)
    Storage-->>Cmd: 原始消息数组

    Cmd->>Recovery: 恢复处理
    Recovery->>Recovery: migrateLegacyAttachmentTypes()
    Recovery->>Recovery: normalizeMessages()
    Recovery->>Recovery: filterOrphanedThinking()
    Recovery->>Recovery: filterUnresolvedToolUses()

    Recovery->>Recovery: 检测中断状态
    Note over Recovery: 最后一轮有未完成 tool_use?<br/>→ kind: interrupted_prompt

    Cmd->>Storage: copyFileHistoryForResume()
    Cmd->>Storage: copyPlanForResume()
    Cmd->>State: processSessionStartHooks()

    Cmd->>State: switchSession(newSessionId)
    State->>State: 更新全局 sessionId
    State->>State: 设置 current_session 链接

    Cmd-->>REPL: 恢复的消息数组
    REPL->>User: 显示对话历史, 继续
```

---

## 流程 5：自动压缩

```mermaid
sequenceDiagram
    participant Q as query() 主循环
    participant AC as autoCompact
    participant Fork as Forked Agent
    participant Compact as compact.ts
    participant State as bootstrap/state

    Q->>AC: calculateTokenWarningState()
    AC->>AC: 累计 tokenUsage
    AC->>AC: 对比阈值 (有效窗口 - 13K)

    alt tokens 超阈值
        AC->>AC: 检查断路器 (连续失败 < 3?)
        AC->>Fork: 启动压缩代理

        Fork->>Compact: compactConversation()
        Compact->>Compact: getMessagesAfterCompactBoundary()
        Compact->>Compact: 生成 NO_TOOLS_PREAMBLE
        Compact->>Compact: 生成 <analysis> + <summary>

        alt Session Memory 可用
            Compact->>Compact: trySessionMemoryCompaction()
            Note over Compact: 优先尝试, 成本更低
        end

        Compact-->>Fork: CompactionResult { summary }

        Fork->>Fork: buildPostCompactMessages()
        Fork->>Fork: 创建 SystemCompactBoundaryMessage

        Fork-->>Q: 压缩后的消息数组
        
        Q->>State: markPostCompaction()
        Q->>Q: runPostCompactCleanup()
        Note over Q: 重置缓存, 通知 cache break
    else tokens 未超
        AC-->>Q: 继续正常
    end
```

### 压缩后消息结构

```
压缩前: [msg1, msg2, ..., msg50, msg51, ..., msg100]
                    ↓ 压缩范围 ↓
压缩后: [msg1, msg2, CompactBoundaryMessage{summary}, msg97, msg98, msg99, msg100]
```

---

## 流程 6：子代理生命周期

```mermaid
sequenceDiagram
    participant Model as 主模型
    participant AT as AgentTool
    participant RA as runAgent()
    participant Pool as assembleToolPool()
    participant SubQ as 子代理 query()
    participant Notify as 通知系统

    Model->>AT: Agent({desc, prompt, type})

    AT->>AT: selectAgent(type)
    AT->>AT: initializeAgentMcpServers()
    AT->>AT: buildSystemPrompt()

    AT->>Pool: 组装子代理工具池
    Pool->>Pool: globalTools + mcpTools
    Pool->>Pool: 应用 tools/disallowedTools 过滤
    Pool-->>AT: 最终工具集

    AT->>RA: runAgent(definition, messages, prompt)
    RA->>RA: createAgentId()
    
    alt worktree 隔离
        RA->>RA: createAgentWorktree()
    end

    RA->>RA: cloneFileStateCache()
    RA->>RA: registerAsyncAgent()

    loop 子代理执行循环
        SubQ->>SubQ: API 调用
        SubQ->>SubQ: 工具执行
        SubQ->>SubQ: 消息收集
        RA->>Notify: updateAsyncAgentProgress()
    end

    SubQ-->>RA: 最终结果

    alt 异步模式
        RA->>Notify: enqueueAgentNotification()
        Notify->>Model: <task-notification>
    else 同步模式
        RA-->>AT: 结果文本
        AT-->>Model: tool_result
    end

    RA->>RA: 清理 (MCP关闭, worktree删除)
```

---

## 流程 7：文件编辑完整链路

```mermaid
sequenceDiagram
    participant Model as Claude 模型
    participant FE as FileEditTool
    participant Perm as 权限系统
    participant FS as 文件系统
    participant Cache as FileStateCache
    participant History as fileHistory
    participant Notify as 通知

    Model->>FE: Edit({path, old_str, new_str})

    FE->>FE: expandPath() 解析绝对路径
    FE->>FS: readFileSync() 读取当前内容
    FE->>FE: 检查 MAX_EDIT_FILE_SIZE (1 GiB)

    FE->>Perm: checkWritePermission()
    Perm->>Perm: matchingRuleForInput()
    Perm->>Perm: classifierDecision (auto mode)
    
    alt 拒绝
        Perm-->>FE: denied
        FE-->>Model: 错误: 权限不足
    end

    FE->>FE: findActualString(old_str)
    
    alt 未找到
        FE->>FE: searchSimilarFile() 提示相似
        FE-->>Model: 错误: old_str 不存在
    end

    FE->>History: fileHistoryTrackEdit()
    History->>History: 创建快照 {hash}@v{N}
    History->>History: recordSnapshot(messageId, backups)

    FE->>FS: writeTextContent() 写入修改
    FE->>FS: readFileSync() 验证写入
    FE->>FE: fetchSingleFileGitDiff()

    par 并行副作用
        FE->>Notify: notifyVscodeFileUpdated()
        FE->>Notify: clearDeliveredDiagnostics()
        FE->>Notify: activateConditionalSkills()
        FE->>Notify: checkTeamMemSecrets()
    end

    FE->>Cache: 更新 FileStateCache
    FE-->>Model: { summary, diff, undoCommand }
```

---

## 跨模块数据流矩阵

```mermaid
graph LR
    subgraph 输入层["输入层"]
        KEY["键盘事件"]
        PASTE["粘贴/附件"]
        SLASH["斜杠命令"]
        HOOK_IN["Hook 输入"]
    end

    subgraph 处理层["处理层"]
        PUI["processUserInput"]
        QUERY["query() 主循环"]
        ORCH["toolOrchestration"]
    end

    subgraph 执行层["执行层"]
        TOOLS["43+ 工具"]
        MCP_E["MCP 工具"]
        AGENT_E["子代理"]
    end

    subgraph 持久层["持久层"]
        SESSION["会话存储"]
        FILE_HIST["文件历史"]
        MEMORY_SYS["记忆系统"]
        COST_SYS["费用追踪"]
    end

    subgraph 输出层["输出层"]
        INK["Ink 渲染"]
        NOTIFY_OUT["通知"]
        IDE_OUT["IDE 同步"]
    end

    KEY & PASTE & SLASH --> PUI
    HOOK_IN --> PUI
    PUI --> QUERY
    QUERY --> ORCH
    ORCH --> TOOLS & MCP_E & AGENT_E
    TOOLS --> QUERY
    QUERY --> SESSION & COST_SYS
    TOOLS --> FILE_HIST
    QUERY --> MEMORY_SYS
    QUERY --> INK
    TOOLS --> NOTIFY_OUT & IDE_OUT
```

---

## 关键跨模块数据传递

| 数据类型 | 来源 | 流向 | 目标 |
|---------|------|------|------|
| `Message[]` | processUserInput | query() | API + sessionStorage |
| `ToolUseBlock` | API 流 | toolOrchestration | Tool.call() |
| `PermissionDecision` | permissions.ts | useCanUseTool | UI + denialTracking |
| `ToolUseContext` | QueryEngine | runAgent | 子代理隔离上下文 |
| `FileStateCache` | FileReadTool | FileEditTool | 跨工具共享 |
| `FileHistorySnapshot` | fileHistory | sessionStorage | /resume 恢复 |
| `MCPServerConnection` | mcp/client | MCPTool | MCP 执行 |
| `CostState` | cost-tracker | bootstrap/state | /cost 显示 |
| `CompactBoundaryMessage` | compact.ts | query() | 消息数组替换 |
| `SDKMessage` | QueryEngine | Ink 渲染 | 终端输出 |
