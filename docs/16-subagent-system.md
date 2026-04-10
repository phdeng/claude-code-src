# 16 - 子代理系统 (Subagent System)

## 架构总览

```mermaid
graph TB
    subgraph 定义层["Agent 定义来源"]
        BUILTIN["Built-in Agents<br/>src/tools/AgentTool/built-in/"]
        PLUGIN_A["Plugin Agents<br/>插件提供"]
        USER_A["User Agents<br/>~/.claude/agents/*.md"]
        PROJECT_A["Project Agents<br/>.claude/agents/*.md"]
    end

    subgraph 加载层["定义加载"]
        LOAD["getAgentDefinitionsWithOverrides(cwd)"]
    end

    subgraph 创建层["Agent 创建"]
        AGENT_TOOL["AgentTool<br/>call(description, prompt,<br/>subagent_type, ...)"]
    end

    subgraph 执行层["执行引擎"]
        RUN["runAgent()"]
        SYNC["同步模式<br/>阻塞等待结果"]
        ASYNC["异步模式<br/>后台运行"]
        FORK_RUN["Fork 模式<br/>继承上下文后台运行"]
    end

    BUILTIN & PLUGIN_A & USER_A & PROJECT_A --> LOAD
    LOAD --> AGENT_TOOL
    AGENT_TOOL --> RUN
    RUN --> SYNC & ASYNC & FORK_RUN
```

## Built-in Agent 类型

```mermaid
graph TD
    subgraph 内置代理["6 个 Built-in Agents"]
        GP["general-purpose<br/>通用代理<br/>工具: 全部<br/>用途: 研究、搜索、执行多步任务"]
        EXPLORE["Explore<br/>代码库探索<br/>工具: 除 Agent/Edit/Write 外全部<br/>用途: 快速搜索、找文件、回答代码问题"]
        PLAN["Plan<br/>架构规划<br/>工具: 除 Agent/Edit/Write 外全部<br/>用途: 设计实现方案、识别关键文件"]
        VERIFY_A["verification<br/>验证代理<br/>工具: 全部 (Ant 门控)<br/>用途: 独立对抗性验证"]
        STATUSLINE["statusline-setup<br/>状态行配置<br/>工具: Read, Edit<br/>用途: 配置 shell 状态行"]
        GUIDE["claude-code-guide<br/>Claude Code 指南<br/>工具: Glob, Grep, Read, WebFetch, WebSearch<br/>用途: 回答 Claude Code/API 使用问题"]
    end

    style GP fill:#dfd
    style EXPLORE fill:#ddf
    style PLAN fill:#ddf
    style VERIFY_A fill:#fdd
    style STATUSLINE fill:#ffd
    style GUIDE fill:#ffd
```

## Agent 定义加载优先级

```mermaid
flowchart TD
    LOAD["getAgentDefinitionsWithOverrides(cwd)"]

    LOAD --> P1["1. Plugin Agents (最高优先级)"]
    LOAD --> P2["2. User Agents (~/.claude/agents/)"]
    LOAD --> P3["3. Project Agents (.claude/agents/)"]
    LOAD --> P4["4. Policy Agents"]
    LOAD --> P5["5. Built-in Agents (最低优先级)"]

    P1 & P2 & P3 & P4 & P5 --> DEDUP["去重: 同名后加载覆盖先加载"]
    DEDUP --> FINAL["最终 Agent 列表"]
```

## Agent 执行生命周期

```mermaid
sequenceDiagram
    participant Model as Claude 模型
    participant AT as AgentTool
    participant RA as runAgent()
    participant Agent as 子代理
    participant Tools as 工具系统
    participant Cost as CostTracker

    Model->>AT: tool_use: Agent({description, prompt, subagent_type})

    AT->>AT: 1. 选择 Agent 定义
    AT->>AT: 2. 验证权限 (getDenyRuleForAgent)
    AT->>AT: 3. 初始化 MCP 服务器
    AT->>AT: 4. 生成系统提示

    alt 同步模式
        AT->>RA: runAgent(definition, messages, systemPrompt)
        RA->>Agent: 创建 Agent 上下文
        loop 直到完成或 maxTurns
            Agent->>Tools: 执行工具调用
            Tools-->>Agent: 工具结果
            Agent->>Agent: 生成下一步
        end
        RA->>Cost: 累计 Token 和费用
        RA-->>AT: 最终结果文本
        AT-->>Model: tool_result

    else 异步后台模式
        AT->>RA: registerAsyncAgent(...)
        AT-->>Model: "Agent launched in background"
        RA->>Agent: 后台执行
        Agent->>Agent: 工作中...
        Agent-->>RA: 完成
        RA->>Model: <task-notification> (伪用户消息)
    end
```

## 执行模式决策

```mermaid
flowchart TD
    CALL["AgentTool.call()"] --> CHECK{"执行模式决策"}

    CHECK -->|"coordinator mode<br/>+ run_in_background"| COORD_ASYNC["Coordinator Worker<br/>async_launched"]
    CHECK -->|"team_name 存在"| TEAMMATE["生成 Teammate<br/>teammate_spawned"]
    CHECK -->|"fork enabled<br/>+ 无 subagent_type"| FORK["Fork 子代理<br/>async_launched"]
    CHECK -->|"isolation=worktree"| WORKTREE["Worktree 隔离<br/>后台运行"]
    CHECK -->|"run_in_background=true"| BG["后台代理<br/>async_launched"]
    CHECK -->|"默认"| SYNC_MODE["同步运行<br/>阻塞等待"]

    COORD_ASYNC --> NOTIFY["完成后:<br/>&lt;task-notification&gt;"]
    TEAMMATE --> MSG["通过邮箱通信"]
    FORK --> NOTIFY
    WORKTREE --> NOTIFY
    BG --> NOTIFY
    SYNC_MODE --> RESULT["直接返回结果"]
```

## Fork 子代理 vs 常规子代理

```mermaid
graph LR
    subgraph 常规子代理["常规子代理"]
        R1["零上下文启动"]
        R2["独立系统提示"]
        R3["独立缓存键"]
        R4["可同步或异步"]
        R5["适合: 专门技能任务"]
    end

    subgraph Fork子代理["Fork 子代理"]
        F1["继承完整父级对话"]
        F2["继承父级系统提示字节"]
        F3["共享提示缓存 ✓"]
        F4["始终异步后台"]
        F5["适合: 研究/开放式问题"]
    end

    style Fork子代理 fill:#ffe
```

### Fork 消息构建

```mermaid
sequenceDiagram
    participant Parent as 父级对话
    participant Fork as Fork 子代理

    Note over Parent: 消息 1: 用户说 "分析代码"
    Note over Parent: 消息 2: 助手调用 Agent(fork)
    Note over Parent: 消息 3: tool_result "Fork started"

    Parent->>Fork: buildForkedMessages()
    Note over Fork: 1. 复制完整父级消息
    Note over Fork: 2. 所有 tool_result → 占位符<br/>"Fork started — processing in background"
    Note over Fork: 3. 添加 FORK_BOILERPLATE_TAG<br/>(防递归分叉)
    Note over Fork: 4. 字节级一致 = 缓存共享
```

### Fork 防护机制

```mermaid
flowchart TD
    FORK_CALL["Agent() 无 subagent_type"] --> CHECK{"Fork 启用?"}

    CHECK -->|否| NORMAL["常规 general-purpose"]
    CHECK -->|是| IN_FORK{"已在 Fork 中?"}

    IN_FORK -->|"检测到 FORK_BOILERPLATE_TAG"| BLOCK["阻止递归分叉<br/>当作常规 Agent"]
    IN_FORK -->|"否"| CREATE_FORK["创建 Fork 子代理"]
```

## 工具池组装

```mermaid
flowchart TD
    DEF["Agent 定义"] --> TOOLS_DEF{"tools 属性?"}

    TOOLS_DEF -->|"'*' 或 未指定"| ALL["所有可用工具"]
    TOOLS_DEF -->|"['Read', 'Bash', ...]"| SPECIFIC["仅指定工具"]

    ALL --> DENY["减去 disallowedTools"]
    SPECIFIC --> DENY

    DENY --> PERM["应用权限模式过滤"]
    PERM --> MCP_MERGE["合并 Agent MCP 工具"]
    MCP_MERGE --> FINAL_TOOLS["最终工具池"]

    DEF --> FORK_CHECK{"Fork 模式?"}
    FORK_CHECK -->|"是"| EXACT["useExactTools: true<br/>保持字节一致"]
    FORK_CHECK -->|"否"| NORMAL_POOL["标准工具池"]
```

## Worktree 隔离

```mermaid
stateDiagram-v2
    [*] --> 创建Worktree
    创建Worktree --> Agent执行 : git worktree add .claude/worktrees/{id}
    Agent执行 --> 检查变更 : Agent 完成
    检查变更 --> 有变更 : hasWorktreeChanges = true
    检查变更 --> 无变更 : hasWorktreeChanges = false
    有变更 --> 保留分支 : 返回 worktree 路径和分支名
    无变更 --> 清理 : git worktree remove
    清理 --> [*]
    保留分支 --> [*]
```

## 异步 Agent 通知流

```mermaid
flowchart TD
    ASYNC["异步 Agent 启动<br/>registerAsyncAgent()"]
    ASYNC --> RUN["后台执行"]

    RUN --> PROGRESS["updateAsyncAgentProgress()<br/>定期更新进度"]
    RUN --> COMPLETE{"执行结果"}

    COMPLETE -->|成功| DONE["completeAgentTask()"]
    COMPLETE -->|失败| FAIL["failAgentTask()"]
    COMPLETE -->|中止| KILL["用户 TaskStop"]

    DONE --> NOTIFY["enqueueAgentNotification()"]
    FAIL --> NOTIFY
    KILL --> NOTIFY

    NOTIFY --> INJECT["注入 &lt;task-notification&gt;<br/>到父级对话"]

    INJECT --> XML["&lt;task-notification&gt;<br/>  &lt;task-id&gt;{agentId}&lt;/task-id&gt;<br/>  &lt;status&gt;completed|failed|killed&lt;/status&gt;<br/>  &lt;summary&gt;outcome&lt;/summary&gt;<br/>  &lt;result&gt;最终文本&lt;/result&gt;<br/>  &lt;usage&gt;tokens/tools/duration&lt;/usage&gt;<br/>&lt;/task-notification&gt;"]
```

## 自定义 Agent 示例

```markdown
# .claude/agents/code-reviewer.md

---
name: code-reviewer
description: "Reviews code for quality and security"
tools: [Read, Grep, Glob, Bash]
model: opus
effort: 4
permissionMode: bubble
maxTurns: 20
mcpServers:
  - github
memory: project
omitClaudeMd: false
---

You are a code review specialist. Analyze code changes for:
1. Security vulnerabilities (OWASP top 10)
2. Performance issues
3. Code style consistency
4. Test coverage gaps

Always provide actionable feedback with file:line references.
```

## 门控条件

```mermaid
graph TD
    subgraph 门控["Agent 功能门控"]
        FORK_GATE["Fork 子代理<br/>feature('FORK_SUBAGENT')<br/>+ CLAUDE_CODE_FORK_SUBAGENT=1<br/>+ !isCoordinatorMode()"]
        VERIFY_GATE["验证代理<br/>feature('VERIFICATION_AGENT')<br/>+ tengu_hive_evidence"]
        EXPLORE_GATE["Explore/Plan<br/>areExplorePlanAgentsEnabled()<br/>+ !isForkSubagentEnabled()"]
        WORKTREE_GATE["Worktree 隔离<br/>isWorktreeModeEnabled()"]
    end
```
