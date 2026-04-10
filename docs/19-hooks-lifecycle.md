# 19 - Hook 生命周期系统

## 25 个 Hook 事件完整参考

```mermaid
graph TD
    subgraph 工具生命周期["工具生命周期"]
        PRE["PreToolUse<br/>工具调用前"]
        POST["PostToolUse<br/>工具调用后"]
        POST_FAIL["PostToolUseFailure<br/>工具调用失败"]
    end

    subgraph 权限["权限事件"]
        PERM_REQ["PermissionRequest<br/>显示权限对话"]
        PERM_DENY["PermissionDenied<br/>Auto mode 拒绝"]
    end

    subgraph 会话["会话生命周期"]
        SESSION_START["SessionStart<br/>source: startup|resume|clear|compact"]
        SESSION_END["SessionEnd"]
        STOP["Stop<br/>正常回复结束"]
        STOP_FAIL["StopFailure<br/>API 错误"]
    end

    subgraph 代理["代理事件"]
        SUB_START["SubagentStart"]
        SUB_STOP["SubagentStop"]
        TM_IDLE["TeammateIdle"]
    end

    subgraph 任务["任务事件"]
        TASK_CREATE["TaskCreated"]
        TASK_COMPLETE["TaskCompleted"]
    end

    subgraph 输入["用户输入"]
        USER_SUBMIT["UserPromptSubmit"]
        ELICIT["Elicitation<br/>MCP 请求用户输入"]
        ELICIT_RESULT["ElicitationResult"]
    end

    subgraph 配置["配置与文件"]
        CONFIG_CHANGE["ConfigChange<br/>设置文件变化"]
        INSTRUCT_LOAD["InstructionsLoaded<br/>CLAUDE.md 加载"]
        CWD_CHANGE["CwdChanged"]
        FILE_CHANGE["FileChanged"]
    end

    subgraph 其他["其他"]
        SETUP["Setup<br/>trigger: init|maintenance"]
        NOTIFY["Notification"]
        PRE_COMPACT["PreCompact"]
        POST_COMPACT["PostCompact"]
    end
```

## 4 种 Hook 类型

```mermaid
graph LR
    subgraph Command["command 类型"]
        C_DESC["执行 Shell 命令"]
        C_SHELL["shell: bash | powershell"]
        C_ASYNC["async: 后台运行"]
        C_REWAKE["asyncRewake: 完成后唤醒"]
        C_ONCE["once: 只执行一次"]
    end

    subgraph Prompt["prompt 类型"]
        P_DESC["调用 LLM 判断"]
        P_MODEL["model: 指定模型"]
        P_TIMEOUT["timeout: 超时控制"]
    end

    subgraph HTTP["http 类型"]
        H_DESC["POST 到外部 webhook"]
        H_URL["url: 目标地址"]
        H_HEADERS["headers: 自定义头"]
        H_ENV["allowedEnvVars: 环境变量插值"]
    end

    subgraph Agent["agent 类型"]
        A_DESC["启动独立智能体验证"]
        A_MODEL["model: 指定模型"]
        A_TURNS["最多 50 轮"]
        A_RESULT["返回 {ok, reason}"]
    end
```

## Hook 执行流程

```mermaid
sequenceDiagram
    participant Event as 事件触发
    participant Filter as 条件过滤
    participant Hook as Hook 执行器
    participant Result as 结果处理

    Event->>Filter: 匹配 if 条件?
    Note over Filter: 权限规则语法<br/>如 "Bash(git *)"

    alt 匹配
        Filter->>Hook: 执行 Hook
        
        alt command 类型
            Hook->>Hook: 执行 Shell 命令
            Note over Hook: Exit 0: 成功 (stdout → model)<br/>Exit 2: 阻塞错误 (stderr → model)<br/>其他: 非阻塞 (stderr → user)
        else prompt 类型
            Hook->>Hook: 调用 LLM
        else http 类型
            Hook->>Hook: POST webhook
        else agent 类型
            Hook->>Hook: 启动 Agent (最多 50 轮)
            Hook-->>Result: {ok: true/false, reason?}
        end
    else 不匹配
        Filter-->>Event: 跳过
    end
```

## PreToolUse / PostToolUse 详细流程

```mermaid
sequenceDiagram
    participant Model as Claude 模型
    participant Pre as PreToolUse Hook
    participant Tool as 工具执行
    participant Post as PostToolUse Hook

    Model->>Pre: tool_use: Bash("git push")
    Note over Pre: 输入: {tool_name, tool_input, tool_use_id}

    alt Hook 返回 exit 2
        Pre-->>Model: 阻塞: stderr 显示给模型
        Note over Model: 工具调用被阻止
    else Hook 返回 exit 0
        Pre->>Tool: 继续执行
        Tool-->>Post: 工具结果
        Note over Post: 输入: {tool_name, tool_input,<br/>tool_use_id, tool_result}
        Post-->>Model: stdout 显示给模型
    end
```

## PermissionRequest Hook 自动决策

```mermaid
flowchart TD
    PERM["权限对话触发"] --> HOOK["执行 PermissionRequest Hook"]
    HOOK --> RESULT{"Hook 返回?"}

    RESULT -->|'exit 0 + JSON {decision: "allow"}'| ALLOW["自动允许"]
    RESULT -->|'exit 0 + JSON {decision: "deny"}'| DENY["自动拒绝"]
    RESULT -->|'exit 2'| BLOCK["阻塞 (显示 stderr)"]
    RESULT -->|'其他'| ASK["正常询问用户"]

    DENY --> DENIED_HOOK["触发 PermissionDenied Hook"]
    DENIED_HOOK --> RETRY{"Hook 返回 {retry: true}?"}
    RETRY -->|是| MODEL["告知模型可重试"]
    RETRY -->|否| FINAL["最终拒绝"]
```

## 文件监视 Hook (FileChanged + CwdChanged)

```mermaid
flowchart TD
    CWD["用户切换目录<br/>Bash cd"] --> CWD_HOOK["CwdChanged Hook"]
    CWD_HOOK --> CWD_INPUT["{old_cwd, new_cwd}"]
    CWD_HOOK --> CWD_OUTPUT["可返回:<br/>CLAUDE_ENV_FILE<br/>watchPaths"]

    WATCH["Chokidar 文件监视<br/>stabilityThreshold: 500ms"]
    WATCH --> EVENT{"事件类型"}
    EVENT --> CHANGE["change"]
    EVENT --> ADD["add"]
    EVENT --> UNLINK["unlink"]

    EVENT --> FILE_HOOK["FileChanged Hook"]
    FILE_HOOK --> FILE_INPUT["{file_path, event_type}"]
    FILE_HOOK --> WATCH_UPDATE["可返回 watchPaths<br/>动态更新监视列表"]
    WATCH_UPDATE --> WATCH
```

## Agent Hook 多轮验证

```mermaid
sequenceDiagram
    participant Trigger as 事件触发
    participant AgentHook as Agent Hook
    participant VM as 虚拟 Agent
    participant Output as StructuredOutput 工具

    Trigger->>AgentHook: 执行 agent hook
    AgentHook->>VM: 创建隔离 Agent<br/>(hookAgentId, 最多 50 轮)

    loop 验证循环
        VM->>VM: 分析上下文
        VM->>VM: 使用可用工具验证
        VM->>Output: 调用 StructuredOutput
        Output-->>VM: 格式化结果
    end

    VM-->>AgentHook: {ok: true/false, reason?}

    alt ok = false
        AgentHook-->>Trigger: 阻塞 + 原因
    else ok = true
        AgentHook-->>Trigger: 继续执行
    end
```

## 完整 Hook 事件参考表

| 事件 | 输入 | Exit 0 | Exit 2 | 用途 |
|------|------|--------|--------|------|
| **PreToolUse** | tool_name, tool_input, tool_use_id | stdout→model | 阻塞工具调用 | 工具调用前拦截 |
| **PostToolUse** | tool_name, tool_input, tool_use_id, tool_result | stdout→model | stderr→model | 工具完成后处理 |
| **PostToolUseFailure** | tool_name, tool_input, error | stdout→model | 忽略 | 工具失败后处理 |
| **PermissionRequest** | tool_name, tool_input, tool_use_id | JSON{decision} | 阻塞 | 自动权限决策 |
| **PermissionDenied** | tool_name, tool_input, reason | JSON{retry} | 忽略 | 拒绝后重试 |
| **UserPromptSubmit** | prompt_text | stdout→model | 阻塞提交 | 输入预处理 |
| **SessionStart** | source | stdout→model | 忽略 | 会话初始化 |
| **SessionEnd** | (空) | 忽略 | 忽略 | 会话清理 |
| **Stop** | (空) | 忽略 | stderr→model,继续 | 回复结束后 |
| **StopFailure** | error_type | 忽略 | 忽略 | API 错误观测 |
| **SubagentStart** | agent_id, agent_type | stdout→subagent | 忽略 | 代理启动 |
| **SubagentStop** | agent_id, agent_type, transcript_path | 忽略 | stderr→继续 | 代理停止 |
| **PreCompact** | details | stdout→自定义指令 | 阻止压缩 | 压缩前拦截 |
| **PostCompact** | details, summary | stdout→user | 忽略 | 压缩后通知 |
| **TeammateIdle** | teammate_name, team_name | 忽略 | 阻止空闲 | 队友管理 |
| **TaskCreated** | task_id, subject, description | 忽略 | 阻止创建 | 任务追踪 |
| **TaskCompleted** | task_id, subject | 忽略 | 阻止完成 | 任务验证 |
| **Elicitation** | mcp_server, message, schema | JSON{action,content} | 忽略 | MCP 自动应答 |
| **ElicitationResult** | mcp_server, result | JSON 可修改 | 忽略 | 结果处理 |
| **ConfigChange** | source, file_path | 忽略 | 阻止应用 | 配置监控 |
| **InstructionsLoaded** | file_path, memory_type, load_reason | 忽略 | 忽略 | 观测性 |
| **CwdChanged** | old_cwd, new_cwd | CLAUDE_ENV_FILE, watchPaths | 忽略 | 目录切换 |
| **FileChanged** | file_path, event_type | watchPaths | 忽略 | 文件变化 |
| **Setup** | trigger: init\|maintenance | 忽略 | 忽略 | 仓库初始化 |
| **Notification** | notification_details | 忽略 | 忽略 | 通知分发 |
