# 22 - 深层内部机制（第四批）

> 最终一轮源码挖掘：工具协调引擎、多层压缩、任务系统、日志/调试基础设施、VCR、权限追踪等。

---

## 1. 工具协调引擎 (Tool Orchestration)

**文件**: `src/services/tools/toolOrchestration.ts`, `src/services/tools/StreamingToolExecutor.ts`

```mermaid
flowchart TD
    CALLS["模型返回多个 tool_use"] --> PARTITION["分区"]

    PARTITION --> READ_GROUP["只读组<br/>FileRead, Glob, Grep,<br/>WebFetch, WebSearch"]
    PARTITION --> WRITE_GROUP["写入组<br/>FileEdit, BashTool,<br/>FileWrite 等"]

    READ_GROUP --> PARALLEL["并行执行<br/>最多 10 个<br/>(可通过 env 配置)"]
    WRITE_GROUP --> SERIAL["串行执行<br/>互斥访问"]

    PARALLEL & SERIAL --> CTX_MOD["上下文修改器<br/>队列化 → 完成后应用"]

    subgraph 流式执行["StreamingToolExecutor"]
        STREAM["流式进度消息"]
        SIBLING_ABORT["siblingAbortController<br/>错误时强制关闭同级子进程"]
        DISCARD["丢弃机制<br/>降级时合成错误"]
    end

    subgraph 并发配置["并发配置"]
        ENV["MAX_CONCURRENT_TOOL_EXECUTIONS<br/>默认 10"]
    end
```

---

## 2. 多层消息压缩管线

**文件**: `src/query.ts:400-500` 区域

```mermaid
flowchart TD
    MSG["每轮结束后"] --> PIPELINE["压缩管线"]

    PIPELINE --> L1["Layer 1: History Snip<br/>feature('HISTORY_SNIP')<br/>删除旧工具结果"]
    L1 --> L2["Layer 2: Microcompact<br/>选择性压缩 6 类工具结果<br/>Bash/Grep/Glob/WebSearch/<br/>WebFetch/FileEdit"]
    L2 --> L3["Layer 3: Context Collapse<br/>feature('CONTEXT_COLLAPSE')<br/>项目级背景摘要"]
    L3 --> L4["Layer 4: Reactive Compact<br/>feature('REACTIVE_COMPACT')<br/>动态消息压缩"]
    L4 --> L5["Layer 5: AutoCompact<br/>tokens ≥ 有效窗口 - 13K<br/>fork agent 生成 summary"]
    L5 --> L6["Layer 6: Session Memory Compact<br/>后台会话摘要"]

    subgraph Microcompact详情["Microcompact 详情"]
        MC_LIMIT["映像大小限制: 2000 tokens"]
        MC_CACHE["缓存编辑 (CACHED_MICROCOMPACT)<br/>pendingCacheEdits 在 API 请求中消费"]
        MC_TIME["时间基础配置<br/>ETag 管理"]
    end

    subgraph AutoCompact详情["AutoCompact 详情"]
        AC_THRESHOLD["阈值: 有效窗口 - 13K"]
        AC_BREAKER["断路器: 3 次失败停止"]
        AC_RESERVE["保留 20K tokens 给摘要"]
        AC_ENV["CLAUDE_AUTOCOMPACT_PCT_OVERRIDE"]
    end
```

---

## 3. 任务系统架构

**文件**: `src/tasks.ts`, `src/tasks/`

```mermaid
graph TD
    subgraph 核心任务["核心任务类型"]
        SHELL["LocalShellTask<br/>本地 bash 命令"]
        AGENT["LocalAgentTask<br/>本地代理执行"]
        REMOTE["RemoteAgentTask<br/>远程会话代理"]
        DREAM["DreamTask<br/>记忆巩固"]
    end

    subgraph 功能任务["功能门控任务"]
        WORKFLOW["LocalWorkflowTask<br/>feature('WORKFLOW_SCRIPTS')"]
        MONITOR["MonitorMcpTask<br/>feature('MONITOR_TOOL')"]
        TEAMMATE["InProcessTeammateTask<br/>isAgentSwarmsEnabled()"]
    end

    subgraph 管理["任务管理"]
        STOP["stopTask.ts<br/>终止逻辑"]
        KILL["killShellTasks.ts<br/>信号处理和清理"]
        PILL["pillLabel.ts<br/>UI 标签渲染"]
        GUARDS["guards.ts<br/>bash 命令验证"]
    end

    SHELL & AGENT & REMOTE & DREAM --> STOP
    WORKFLOW & MONITOR & TEAMMATE --> STOP
```

---

## 4. API 日志与网关检测

**文件**: `src/services/api/logging.ts`

```mermaid
flowchart TD
    API_CALL["API 调用"] --> LOG["请求日志记录"]

    LOG --> GATEWAY["网关自动检测"]
    GATEWAY --> G1["LiteLLM"]
    GATEWAY --> G2["Helicone"]
    GATEWAY --> G3["Portkey"]
    GATEWAY --> G4["CloudFlare AI Gateway"]
    GATEWAY --> G5["Kong"]
    GATEWAY --> G6["Braintrust / Databricks"]

    LOG --> CACHE_POLICY["缓存策略跟踪<br/>tool_based / system_prompt / none"]
    LOG --> QUERY_CHAIN["查询链追踪<br/>深度 + 链 ID"]
    LOG --> BUILD_AGE["构建年龄<br/>距当前时间的分钟数"]
    LOG --> OUTPUT_STATS["输出长度统计<br/>text / thinking / tool_use"]

    subgraph 诊断["连接诊断"]
        SSL["SSL 错误检测"]
        CONN["连接代码提取"]
        FALLBACK["非流式回退标记"]
    end
```

---

## 5. VCR 录制/回放系统

**文件**: `src/services/vcr.ts`

```mermaid
flowchart TD
    MODE{"VCR 模式?"}

    MODE -->|"VCR_RECORD=1"| RECORD["录制模式"]
    MODE -->|"NODE_ENV=test"| REPLAY["回放模式"]
    MODE -->|"默认"| OFF["关闭"]

    RECORD --> CAPTURE["捕获 API 请求"]
    CAPTURE --> DEHYDRATE["脱水处理<br/>路径规范化<br/>敏感数据移除<br/>UUID/时间戳规范化"]
    DEHYDRATE --> HASH["SHA1 哈希生成"]
    HASH --> FIXTURE["写入测试夹具文件"]

    REPLAY --> MATCH["请求匹配 (SHA1)"]
    MATCH --> HYDRATE["补水处理<br/>恢复动态值"]
    HYDRATE --> RETURN["返回缓存响应"]

    subgraph 高级功能["高级功能"]
        STREAM_VCR["流式 VCR<br/>AsyncGenerator 处理"]
        CROSS_PLATFORM["跨平台路径<br/>Windows / vs \\ vs JSON 转义"]
        DEEP_RECURSE["深度递归值映射<br/>嵌套工具输入处理"]
    end
```

---

## 6. 调试与日志基础设施

**文件**: `src/utils/debug.ts`, `src/utils/log.ts`

```mermaid
flowchart TD
    subgraph 调试["调试系统"]
        ENABLE["运行时启用<br/>/debug 命令 (无需重启)"]
        FILTER["过滤模式<br/>--debug=pattern"]
        STDERR["stderr 输出<br/>-d2e 标志"]
        CUSTOM["自定义路径<br/>--debug-file=path"]
        BUFFER["缓冲写入<br/>~1/秒刷新 (Ant)"]
        SYMLINK["latest 符号链接<br/>~/.claude/debug/latest"]
    end

    subgraph 日志["日志系统"]
        RING["错误环形缓冲区<br/>最多 100 条"]
        SINK["延迟初始化接收器<br/>支持子命令"]
        DRAIN["队列排水<br/>接收器附加前不丢失"]
        MCP_LOG["MCP 错误/调试<br/>单独跟踪"]
        API_CAP["API 请求捕获<br/>去消息化 (防内存泄漏)"]
    end
```

---

## 7. 提示词转储 (Prompt Dumping)

**文件**: `src/services/api/dumpPrompts.ts`

```mermaid
flowchart TD
    API_REQ["API 请求发出"] --> DUMP{"转储启用?<br/>(Ant 用户)"}

    DUMP -->|是| CACHE["缓存最近 5 条请求"]
    DUMP -->|否| SKIP["跳过"]

    CACHE --> INCR["仅记录增量消息<br/>(非完整历史)"]
    CACHE --> ASYNC["setImmediate()<br/>避免阻塞 API 调用"]
    CACHE --> FINGERPRINT["初始化指纹<br/>跳过重复哈希计算"]

    CACHE --> ISSUE["/issue 命令<br/>使用缓存的请求数据"]
```

---

## 8. 权限拒绝跟踪

**文件**: `src/utils/permissions/denialTracking.ts`

```mermaid
stateDiagram-v2
    [*] --> 正常
    正常 --> 连续计数+1 : 工具被拒绝
    连续计数+1 --> 正常 : 工具成功 (重置连续计数)
    连续计数+1 --> 连续阈值 : 连续 3 次拒绝

    state 连续阈值 {
        [*] --> 提示回退
        提示回退 : 告知模型停止重试同类工具
    }

    正常 --> 总计+1 : 工具被拒绝
    总计+1 --> 总计阈值 : 累计 20 次拒绝

    state 总计阈值 {
        [*] --> 全局提示回退
        全局提示回退 : 更强烈的工具使用限制
    }

    note right of 正常
        成功时重置连续计数
        但保留总计数
    end note
```

---

## 9. Advisor 模型 (双模型建议)

**文件**: `src/commands/advisor.ts`

```mermaid
flowchart TD
    USER["/advisor opus"] --> SET["设置 advisor 模型"]
    SET --> SYNC["同步到 appState<br/>+ userSettings"]

    QUERY["查询执行"] --> MAIN["主模型响应"]
    MAIN --> ADVISOR_CHECK{"advisor 已配置<br/>且主模型支持?"}
    ADVISOR_CHECK -->|是| ADVISOR["advisor 模型提供建议"]
    ADVISOR_CHECK -->|否| SKIP["跳过"]

    UNSET["/advisor unset"] --> CLEAR["清除 advisor"]

    subgraph 成本["成本追踪"]
        NESTED["advisor 成本递归累加"]
        SEPARATE["单独分析事件"]
    end
```

---

## 10. MCP 指令增量追踪

**文件**: `src/utils/mcpInstructionsDelta.ts`

```mermaid
flowchart TD
    MCP_CONN["MCP 连接状态变化"] --> TRACK["指令增量追踪"]

    TRACK --> COMPARE["比较服务器名称集合<br/>(不比较指令内容)"]
    COMPARE --> ADDED{"新服务器?"}
    ADDED -->|是| RENDER["渲染指令块<br/>'## {name}\n{instructions}'"]
    ADDED -->|否| CHECK_REMOVED{"服务器移除?"}
    CHECK_REMOVED -->|是| MARK["标记为已移除"]
    CHECK_REMOVED -->|否| NOOP["无变化"]

    subgraph 客户端合成["客户端侧合成"]
        FIRST_PARTY["第一方服务器<br/>(如 claude-in-chrome)"]
        FIRST_PARTY --> CLIENT_CTX["添加客户端上下文<br/>到服务器指令中"]
    end
```

---

## 11. 工具搜索优化

**文件**: `src/utils/toolSearch.ts`

```mermaid
flowchart TD
    CHECK["工具搜索启用?"] --> AUTO{"ENABLE_TOOL_SEARCH?"}

    AUTO -->|"auto:N"| PERCENT["工具 tokens > 上下文 N%<br/>(默认 10%)"]
    AUTO -->|"true"| FORCE["强制启用"]
    AUTO -->|"false"| DISABLE["禁用"]

    PERCENT --> ESTIMATE["MCP 工具大小估计<br/>2.5 字符/token"]
    ESTIMATE --> THRESHOLD{"超过阈值?"}
    THRESHOLD -->|是| ENABLE["启用 ToolSearch<br/>延迟加载非核心工具"]
    THRESHOLD -->|否| ALL["发送所有工具定义"]

    ENABLE --> DEFER["defer_loading 标志<br/>动态发现"]
```

---

## 12. 代理工具递归防护

**文件**: `src/constants/tools.ts`

```mermaid
flowchart TD
    AGENT_CALL["Agent 工具调用"] --> CHECK{"递归检查"}

    CHECK --> CUSTOM["CUSTOM_AGENT_DISALLOWED_TOOLS"]
    CUSTOM --> NO_AGENT["禁止: AgentTool (防递归)"]
    CUSTOM --> NO_TEAM["禁止: TeamCreate/Delete"]
    CUSTOM --> NO_SEND["禁止: SendMessage"]

    CHECK --> ALL_AGENT["ALL_AGENT_DISALLOWED_TOOLS"]
    ALL_AGENT --> PLUS["+ TaskStop, EnterWorktree,<br/>ExitWorktree, ToolSearch"]

    CHECK --> ASYNC["ASYNC_AGENT_ALLOWED_TOOLS<br/>23 个允许的异步工具"]

    subgraph 例外["例外"]
        ANT["Ant 用户: 允许嵌套代理"]
        COORDINATOR["Coordinator: 允许 Team 工具"]
    end
```

---

## 13. 快速模式 / 工作量 / 多轮执行

**文件**: `src/commands/fast/`, `src/commands/effort/`, `src/commands/passes/`

```mermaid
graph TD
    subgraph 快速模式["/fast"]
        FAST_DESC["切换快速输出模式"]
        FAST_NOTE["同一模型 (Opus 4.6)<br/>更快输出速度"]
    end

    subgraph 工作量["/effort"]
        EFFORT_LEVELS["low | medium | high | max | auto"]
        EFFORT_DESC["控制推理深度"]
    end

    subgraph 多轮["/passes"]
        PASSES_DESC["基于推荐人奖励<br/>动态显示/隐藏"]
    end

    subgraph 模型["/model"]
        MODEL_DESC["显示当前模型<br/>+ immediate 执行"]
        MODEL_INFER["shouldInferenceConfigCommandBeImmediate()<br/>跳过队列"]
    end

    subgraph 分支["/branch"]
        BRANCH_DESC["创建对话分支"]
        BRANCH_ALIAS["别名: /fork<br/>(FORK_SUBAGENT 未启用时)"]
    end
```

---

## 14. 环境检测与内部日志

**文件**: `src/services/internalLogging.ts`

```mermaid
flowchart TD
    ENV_DETECT["环境检测 (Ant)"]

    ENV_DETECT --> K8S["Kubernetes 命名空间<br/>识别 devbox vs laptop"]
    ENV_DETECT --> CONTAINER["OCI 容器 ID<br/>从 /proc/self/mountinfo<br/>Docker/containerd"]
    ENV_DETECT --> PERM_CTX["权限上下文快照<br/>初始化和摘要时刻"]
```

---

## 15. 格式化工具库

**文件**: `src/utils/format.ts`

```
紧凑数字: formatCompactNumber()
  → Intl.NumberFormat 缓存 → K/M/B 表示

相对时间: formatRelativeTime()
  → "ago" 后缀 + 自定义短单位 (y/mo/w/d/h/m/s)

日志元数据: formatLogMetadata()
  → 组合 时间/大小/分支/标签/PR

重置时间: formatResetTime()
  → 条件时区/日期 (基于距重置的距离)
```

---

## 16. 对话分支

**文件**: `src/commands/branch/index.ts`

```mermaid
flowchart TD
    USER["/branch 或 /fork"] --> SNAPSHOT["在当前点创建<br/>对话快照"]
    SNAPSHOT --> NEW_SESSION["创建新会话<br/>继承完整历史"]
    NEW_SESSION --> DIVERGE["从此点开始分叉<br/>两个独立对话"]
```

---

## 17. Rewind/检查点

**文件**: `src/commands/rewind/`

```mermaid
flowchart TD
    USER["/rewind 或 /checkpoint"] --> LIST["列出可用检查点"]
    LIST --> SELECT["用户选择恢复点"]
    SELECT --> RESTORE_CODE["恢复代码状态<br/>(文件快照)"]
    SELECT --> RESTORE_CONV["恢复对话状态<br/>(截断到该点)"]

    NOTE["仅交互模式可用<br/>别名: checkpoint"]
```

---

## 18. Share 与 Teleport

```mermaid
flowchart LR
    subgraph Share["/share"]
        SHARE_DESC["上传会话 transcript<br/>生成 ccshare 链接"]
        SHARE_SLACK["可选: 发到<br/>#claude-code-feedback"]
    end

    subgraph Teleport["/teleport"]
        TELEPORT_DESC["跨环境迁移<br/>CLI → Web / Web → CLI"]
        TELEPORT_API["分页获取事件<br/>1000 条/页, 最多 100 页"]
        TELEPORT_404["中间 404:<br/>返回部分数据"]
    end
```

---

## 19. Stickers

**文件**: `src/commands/stickers/stickers.ts`

```
/stickers → 打开 https://www.stickermule.com/claudecode
失败时回退: 显示 URL 让用户手动访问
```

---

## 20. 统计命令

**文件**: `src/commands/stats/index.ts`

```
/stats → 显示:
  - 会话活跃时间
  - API 调用次数
  - Token 使用量 (input/output/cache)
  - 工具调用统计
  - 代码变更行数
```

---

## 累计场景统计

| 文档 | 场景数 | 累计 |
|------|--------|------|
| 18 - 应用场景 (第一批) | 20 | 20 |
| 19 - Hook 生命周期 | 25 | 45 |
| 20 - 更多场景 (第二批) | 20 | 65 |
| 21 - 高级场景 (第三批) | 20 | 85 |
| **22 - 深层内部 (第四批)** | **20** | **105+** |

至此，Claude Code 源码中的所有主要功能路径、内部机制和隐藏工作流均已覆盖。
