# 17 - Agent Team 协作系统

## 三种多代理模式对比

```mermaid
graph TD
    subgraph 标准模式["标准 Subagent 模式"]
        S_USER["用户"] --> S_MAIN["主 Agent"]
        S_MAIN --> S_SUB1["子代理 (Explore)"]
        S_MAIN --> S_SUB2["子代理 (Plan)"]
        S_SUB1 & S_SUB2 -->|结果| S_MAIN
    end

    subgraph Coordinator["Coordinator 模式"]
        C_USER["用户"] --> C_COORD["Coordinator"]
        C_COORD --> C_W1["Worker #1"]
        C_COORD --> C_W2["Worker #2"]
        C_W1 & C_W2 -->|task-notification| C_COORD
    end

    subgraph Team["Team/Swarm 模式"]
        T_USER["用户"] --> T_LEAD["Team Lead"]
        T_LEAD -->|创建| T_M1["Teammate A"]
        T_LEAD -->|创建| T_M2["Teammate B"]
        T_M1 <-->|SendMessage| T_M2
        T_M1 & T_M2 -->|任务更新| T_LEAD
    end
```

| 维度 | Subagent | Coordinator | Team/Swarm |
|------|----------|-------------|------------|
| 通信方向 | 单向 (主→子→主) | 主→Worker→主 | 双向 (任意成员间) |
| Worker 生命周期 | 单次任务 | 单次任务 | 持续存在 |
| 任务管理 | 无 | 无形式化 | TaskList 系统 |
| 成员发现 | 不可 | 不可 | config.json |
| 适用场景 | 简单并行查询 | 复杂编排 | 大型协作项目 |

---

## Coordinator 模式

### 架构

```mermaid
graph TB
    USER["用户"] --> COORD["Coordinator Agent"]

    COORD -->|"Agent({run_in_background})"| W1["Worker #1"]
    COORD -->|"Agent({run_in_background})"| W2["Worker #2"]
    COORD -->|"Agent({run_in_background})"| W3["Worker #3"]

    W1 -->|"&lt;task-notification&gt;"| COORD
    W2 -->|"&lt;task-notification&gt;"| COORD
    W3 -->|"&lt;task-notification&gt;"| COORD

    COORD -->|合成结果| USER

    style COORD fill:#f9f
```

### 启用方式

```bash
export CLAUDE_CODE_COORDINATOR_MODE=1
# 且需要 feature('COORDINATOR_MODE') 编译时启用
```

### Coordinator 系统提示关键原则

```
## 你的角色
你是协调器。你的工作是：
- 帮用户实现目标
- 指导 Worker 研究、实现、验证代码
- 合成结果并与用户交流
- 能处理的问题直接处理（不用委派）

## Worker 管理工具
- Agent({...}) — 启动新 Worker
- SendMessage({to: agentId, ...}) — 继续现有 Worker
- TaskStop({agent_id: ...}) — 停止 Worker

## 约束
✗ 不要用一个 Worker 检查另一个 Worker 的状态
✗ 不要用 Worker 来报告文件内容（低价值）
✗ 不要设置 model 参数
✓ 启动后简要告诉用户在做什么
✓ 永远不要猜测或编造 Worker 结果
```

### Coordinator 工作流

```mermaid
sequenceDiagram
    participant User as 用户
    participant Coord as Coordinator
    participant W1 as Worker A
    participant W2 as Worker B

    User->>Coord: "重构认证系统"

    Coord->>Coord: 分析任务，制定计划
    Coord->>User: "正在启动两个 Worker..."

    par 并行启动
        Coord->>W1: Agent(prompt: "研究当前认证实现")
        Coord->>W2: Agent(prompt: "研究最佳实践")
    end

    W1-->>Coord: <task-notification> 研究结果
    W2-->>Coord: <task-notification> 最佳实践

    Coord->>Coord: 合成两个 Worker 的发现
    Coord->>Coord: 直接编写重构代码
    Coord->>User: "重构完成。主要变更..."
```

---

## Team/Swarm 模式

### 完整架构

```mermaid
graph TB
    subgraph 创建阶段["1. 创建 Team"]
        TC["TeamCreate({team_name, description})"]
        TC --> TEAM_FILE["~/.claude/teams/{name}/config.json"]
        TC --> TASK_DIR["~/.claude/tasks/{name}/"]
        TC --> LEAD_ID["Team Lead: team-lead@{name}"]
    end

    subgraph 任务阶段["2. 创建任务"]
        TASK_CREATE["TaskCreate({subject, description})"]
        TASK_CREATE --> TASKS["任务列表"]
    end

    subgraph 生成阶段["3. 生成 Teammate"]
        SPAWN["Agent({name, team_name,<br/>subagent_type, prompt})"]
        SPAWN --> TM1["Teammate A"]
        SPAWN --> TM2["Teammate B"]
    end

    subgraph 分配阶段["4. 分配任务"]
        ASSIGN["TaskUpdate({taskId, owner: 'name'})"]
    end

    subgraph 执行阶段["5. 执行与通信"]
        TM1 <-->|SendMessage| TM2
        TM1 -->|TaskUpdate| TASKS
        TM2 -->|TaskUpdate| TASKS
    end

    subgraph 清理阶段["6. 清理"]
        SHUTDOWN["SendMessage({type: shutdown_request})"]
        SHUTDOWN --> TD["TeamDelete()"]
    end
```

### Team 配置文件结构

```json
{
  "name": "backend-team",
  "createdAt": "2026-04-08T...",
  "leadAgentId": "team-lead@backend-team",
  "members": [
    {
      "agentId": "researcher@backend-team",
      "name": "researcher",
      "agentType": "Explore",
      "color": "blue",
      "joinedAt": "2026-04-08T..."
    },
    {
      "agentId": "implementer@backend-team",
      "name": "implementer",
      "agentType": "general-purpose",
      "color": "green",
      "joinedAt": "2026-04-08T..."
    }
  ],
  "teamAllowedPaths": []
}
```

### Teammate 生成后端

```mermaid
flowchart TD
    SPAWN["spawnTeammate(config)"] --> BACKEND{"后端选择"}

    BACKEND -->|推荐| IN_PROC["In-Process 后端<br/>AsyncLocalStorage 隔离<br/>同一进程"]
    BACKEND -->|macOS/Linux| TMUX["Tmux 后端<br/>独立 tmux pane"]
    BACKEND -->|macOS| ITERM["iTerm2 后端<br/>原生 split pane"]

    IN_PROC --> CTX["创建 TeammateContext<br/>(AsyncLocalStorage)"]
    CTX --> REGISTER["注册到 AppState.tasks"]
    REGISTER --> START["startInProcessTeammate()"]

    TMUX --> PANE["创建 tmux pane"]
    PANE --> CMD["发送 Claude Code 启动命令"]

    IN_PROC & TMUX & ITERM --> COLOR["分配颜色"]
    COLOR --> TEAM_REG["注册到 Team File"]
```

### Teammate 间通信

```mermaid
sequenceDiagram
    participant Lead as Team Lead
    participant TM_A as Teammate A
    participant TM_B as Teammate B
    participant Mailbox as 文件邮箱

    Lead->>TM_A: SendMessage({to: "tm-a", message: "开始任务 1"})
    Note over Mailbox: 写入 mailbox/tm-a

    TM_A->>TM_A: 执行任务 1
    TM_A->>Lead: SendMessage({to: "team-lead", message: "任务 1 完成"})

    TM_A->>TM_B: SendMessage({to: "tm-b", message: "你可以开始了"})
    Note over Mailbox: 写入 mailbox/tm-b

    TM_B->>TM_B: 执行任务 2
    TM_B->>Lead: SendMessage({to: "team-lead", message: "任务 2 完成"})

    Note over Lead: Lead 的 idle 通知中<br/>包含 peer DM 摘要
```

### 特殊消息类型

```mermaid
graph TD
    MSG["SendMessage"]

    MSG --> PLAIN["普通文本消息<br/>日常通信"]
    MSG --> SHUTDOWN["shutdown_request<br/>请求 Teammate 停止"]
    MSG --> SHUTDOWN_RESP["shutdown_response<br/>批准/拒绝停止"]
    MSG --> PLAN_RESP["plan_approval_response<br/>批准/拒绝计划"]

    SHUTDOWN -->|"Teammate 批准"| TERMINATE["进程终止"]
    SHUTDOWN -->|"Teammate 拒绝"| CONTINUE["继续运行"]

    subgraph UDS["跨会话消息 (UDS)"]
        UDS_MSG["uds:/path/to.sock<br/>本地 Claude 会话"]
        BRIDGE_MSG["bridge:session_...<br/>远程会话"]
    end
```

### 任务管理完整流程

```mermaid
stateDiagram-v2
    [*] --> pending : TaskCreate
    pending --> in_progress : TaskUpdate(status: in_progress)
    in_progress --> completed : TaskUpdate(status: completed)
    pending --> deleted : TaskUpdate(status: deleted)
    in_progress --> pending : 取消分配

    state pending {
        [*] --> 无owner
        无owner --> 已分配 : TaskUpdate(owner: "name")
    }

    state in_progress {
        [*] --> 执行中
        执行中 --> 等待依赖 : blockedBy 未完成
        等待依赖 --> 执行中 : 依赖完成
    }
```

### 任务依赖

```mermaid
graph TD
    T1["Task #1: 数据库 Schema"] -->|blocks| T2["Task #2: API 端点"]
    T1 -->|blocks| T3["Task #3: 数据迁移"]
    T2 -->|blocks| T4["Task #4: 前端集成"]
    T3 -->|blocks| T4

    T1 -.->|owner| TM_A["Teammate A"]
    T2 -.->|owner| TM_B["Teammate B"]
    T3 -.->|owner| TM_A
    T4 -.->|owner| TM_B

    style T1 fill:#dfd
    style T2 fill:#ffd
    style T3 fill:#ffd
    style T4 fill:#fdd
```

### Teammate 空闲状态

```mermaid
stateDiagram-v2
    [*] --> 工作中 : 接收消息/任务
    工作中 --> 空闲 : 完成当前轮次
    空闲 --> 工作中 : 收到新消息

    state 空闲 {
        [*] --> 等待输入
        等待输入 : 自动发送 idle 通知给 Lead
        等待输入 : 可接收 SendMessage
        等待输入 : 不代表"完成"或"不可用"
    }

    note right of 空闲
        空闲是正常状态
        Team Lead 不应对此反应
        除非需要分配新工作
    end note
```

---

## Team 完整工作流示例

```mermaid
sequenceDiagram
    participant User as 用户
    participant Lead as Team Lead
    participant R as Researcher
    participant I as Implementer

    User->>Lead: "重构用户认证系统"

    Note over Lead: 1. 创建 Team
    Lead->>Lead: TeamCreate({team_name: "auth-refactor"})

    Note over Lead: 2. 创建任务
    Lead->>Lead: TaskCreate({subject: "研究当前实现"})
    Lead->>Lead: TaskCreate({subject: "设计新架构"})
    Lead->>Lead: TaskCreate({subject: "实现新认证"})
    Lead->>Lead: TaskCreate({subject: "编写测试"})
    Lead->>Lead: TaskUpdate({taskId: "3", addBlockedBy: ["2"]})
    Lead->>Lead: TaskUpdate({taskId: "4", addBlockedBy: ["3"]})

    Note over Lead: 3. 生成 Teammate
    Lead->>R: Agent({name: "researcher", team_name: "auth-refactor", subagent_type: "Explore"})
    Lead->>I: Agent({name: "implementer", team_name: "auth-refactor"})

    Note over Lead: 4. 分配任务
    Lead->>Lead: TaskUpdate({taskId: "1", owner: "researcher"})
    Lead->>R: SendMessage("开始任务 #1: 研究当前实现")

    R->>R: 研究代码库
    R->>Lead: SendMessage("研究完成, JWT + session 混合方案")
    R->>R: TaskUpdate({taskId: "1", status: "completed"})

    Lead->>Lead: TaskUpdate({taskId: "2", owner: "researcher"})
    Lead->>R: SendMessage("开始任务 #2: 设计新架构")

    R->>R: 设计架构
    R->>Lead: SendMessage("建议统一为 JWT, 文档在 /docs/auth.md")
    R->>R: TaskUpdate({taskId: "2", status: "completed"})

    Note over Lead: 任务 #3 自动解除阻塞
    Lead->>Lead: TaskUpdate({taskId: "3", owner: "implementer"})
    Lead->>I: SendMessage("开始实现, 参考 /docs/auth.md")

    I->>I: 编写代码
    I->>Lead: SendMessage("实现完成")
    I->>I: TaskUpdate({taskId: "3", status: "completed"})

    Note over Lead: 任务 #4 自动解除阻塞
    Lead->>Lead: TaskUpdate({taskId: "4", owner: "implementer"})
    Lead->>I: SendMessage("编写测试")

    I->>I: 编写测试
    I->>Lead: SendMessage("所有测试通过")
    I->>I: TaskUpdate({taskId: "4", status: "completed"})

    Note over Lead: 6. 清理
    Lead->>R: SendMessage({type: "shutdown_request"})
    Lead->>I: SendMessage({type: "shutdown_request"})
    R-->>Lead: {type: "shutdown_response", approve: true}
    I-->>Lead: {type: "shutdown_response", approve: true}
    Lead->>Lead: TeamDelete()
    Lead->>User: "认证系统重构完成！"
```

## 门控条件

```mermaid
graph TD
    SWARM["Team/Swarm 功能"]

    SWARM --> GATE{"isAgentSwarmsEnabled()"}

    GATE -->|"USER_TYPE=ant"| ENABLED["始终启用"]
    GATE -->|"外部用户"| EXT_CHECK{"两个条件都满足?"}

    EXT_CHECK -->|"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1<br/>+ tengu_amber_flint GrowthBook"| ENABLED
    EXT_CHECK -->|"否"| DISABLED["禁用"]

    COORD["Coordinator 模式"]
    COORD --> COORD_GATE{"isCoordinatorMode()"}
    COORD_GATE -->|"feature('COORDINATOR_MODE')<br/>+ CLAUDE_CODE_COORDINATOR_MODE=1"| C_ENABLED["启用"]
    COORD_GATE -->|"否"| C_DISABLED["禁用"]

    style ENABLED fill:#dfd
    style DISABLED fill:#fdd
    style C_ENABLED fill:#dfd
    style C_DISABLED fill:#fdd
```
