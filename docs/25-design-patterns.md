# 25 - 跨模块设计模式与工程原则

> 从 125+ 场景中提炼出 10 个反复出现的架构模式，附源码验证数据。

---

## 模式总览

```mermaid
mindmap
  root((设计模式))
    缓存策略
      TTL 写透缓存
      LRU 驱逐
      多源分层
    分叉代理
      CacheSafeParams
      6 个核心场景
      隔离机制
    特性门控
      feature() 960次
      GrowthBook 284次
      死代码消除
    错误处理
      toError() 159次
      logError() 908次
      AbortError 检测
    懒加载
      条件 require()
      启动时间优化
    权限规则
      Tool(content) 语法
      通配符匹配
    分析事件
      logEvent() 1041次
      PII 保护
      零依赖排队
    Signal/Store
      事件信号 (无状态)
      响应式存储 (有状态)
    顺序执行
      FIFO 队列
      33 个使用点
    优雅降级
      fail-open
      graceful shutdown
```

---

## 1. 三层缓存架构

**核心文件**: `src/utils/memoize.ts` (270 行)

```mermaid
graph TD
    subgraph Layer1["层 1: TTL 写透缓存"]
        TTL["默认 TTL = 5 分钟"]
        HIT["命中 → 零延迟返回"]
        EXPIRED["过期 → 返回旧值<br/>后台异步刷新"]
        MISS["未命中 → 同步计算"]
        STAMPEDE["refreshing 标志<br/>防雷鸣羊群"]
    end

    subgraph Layer2["层 2: LRU 驱逐"]
        LRU_CAP["容量: 100 条目"]
        LRU_SIZE["大小: 25MB"]
        LRU_EVICT["超限自动驱逐最旧条目"]
    end

    subgraph Layer3["层 3: 多源分层"]
        SESSION["会话合并缓存"]
        SOURCE["源级缓存 (per SettingSource)"]
        FILE["文件解析缓存<br/>(去重磁盘读取 + Zod 解析)"]
    end

    REQ["请求"] --> Layer1
    Layer1 -->|"未命中"| Layer2
    Layer2 -->|"设置相关"| Layer3
```

### TTL 值一览

| 组件 | TTL | 用途 |
|------|-----|------|
| `memoizeWithTTL` 默认 | 5 分钟 | 通用缓存 |
| 时间基础微压缩 | 60 分钟 | API 缓存过期对齐 |
| 策略限制 | 1 小时 | 组织策略轮询 |
| 指标选择退出 (内存) | 1 小时 | API 调用去重 |
| 指标选择退出 (磁盘) | 24 小时 | 跨进程持久化 |
| Grove 配置 | 24 小时 | 隐私策略 |
| 推荐码资格 | 24 小时 | 后台刷新 |
| 设置缓存 | 无限期 | 事件驱动清除 |

---

## 2. 分叉代理模式

**核心文件**: `src/utils/forkedAgent.ts` (690 行), 22 个文件使用

```mermaid
flowchart TD
    PARENT["父进程"] --> FORK["分叉代理"]

    FORK --> CACHE_SAFE["CacheSafeParams 一致性保证"]
    CACHE_SAFE --> SP["systemPrompt (相同字节)"]
    CACHE_SAFE --> UC["userContext (相同)"]
    CACHE_SAFE --> SC["systemContext (相同)"]
    CACHE_SAFE --> TUC["toolUseContext (相同工具集)"]
    CACHE_SAFE --> FCM["forkContextMessages (父消息前缀)"]

    FORK --> ISOLATE["隔离机制"]
    ISOLATE --> I1["readFileState: 克隆"]
    ISOLATE --> I2["abortController: 子控制器"]
    ISOLATE --> I3["toolDecisions: 隔离"]
    ISOLATE --> I4["setAppState: noop (默认)"]
    ISOLATE --> I5["getAppState: 包装避免权限提示"]

    subgraph 6场景["6 个核心分叉场景"]
        S1["session_memory<br/>会话记忆提取"]
        S2["prompt_suggestion<br/>提示建议"]
        S3["magic_docs<br/>文档自动更新"]
        S4["compact<br/>对话压缩"]
        S5["speculation<br/>预测性执行"]
        S6["dream<br/>后台梦想"]
    end
```

**Why CacheSafeParams?** — Anthropic API 缓存键 = `system prompt + tools + model + messages prefix + thinking config`。任何不匹配 → 整个提示缓存失效 → 额外 token 开销。

---

## 3. 特性门控体系

**统计**: `feature()` 960 次 (212 文件), `getFeatureValue()` 284 次 (109 文件)

```mermaid
flowchart TD
    subgraph 编译时["编译时 (feature() 宏)"]
        BUN["Bun 编译器"]
        BUN --> DCE["死代码消除"]
        DCE --> REQ["条件 require()"]
        REQ --> SMALLER["更小的产物"]
    end

    subgraph 运行时["运行时 (GrowthBook)"]
        GB["GrowthBook 服务"]
        GB --> CACHED["getFeatureValue_CACHED_MAY_BE_STALE()<br/>可能返回过期值 (速度优先)"]
        GB --> CHECK["checkStatsigFeatureGate_CACHED_MAY_BE_STALE()"]
    end

    subgraph 环境变量["环境变量"]
        ENV["process.env.*"]
        ENV --> USER_TYPE["USER_TYPE=ant"]
        ENV --> ENABLE["ENABLE_*=true/false"]
    end

    编译时 -->|"代码是否存在"| BINARY["构建产物"]
    运行时 -->|"功能是否激活"| BEHAVIOR["运行时行为"]
    环境变量 -->|"谁在运行"| SCOPE["用户范围"]
```

---

## 4. 错误处理策略

**统计**: `logError()` 908 次 (241 文件), `toError()` 159 次 (59 文件)

```mermaid
flowchart TD
    ERROR["错误发生"] --> TYPE{"错误类型?"}

    TYPE -->|"AbortError"| ABORT["isAbortError()<br/>检测 3 种中止形式:<br/>AbortError / APIUserAbortError<br/>/ DOMException"]
    TYPE -->|"unknown"| CONVERT["toError(unknown)<br/>类型缩窄 → Error"]
    TYPE -->|"Error"| LOG["logError(error)"]

    LOG --> RING["环形缓冲区<br/>最多 100 条"]
    LOG --> SINK["延迟初始化接收器"]
    LOG --> ANALYTICS["logEvent()"]

    subgraph 自定义错误["自定义错误类"]
        CE["ClaudeError"]
        AE["AbortError"]
        CPE["ConfigParseError"]
    end

    subgraph 恢复策略["恢复策略"]
        RETRY["withRetry()<br/>指数退避"]
        BREAKER["断路器<br/>(compact: 3 次)"]
        FALLBACK["优雅降级<br/>(fail-open)"]
    end
```

---

## 5. 懒加载与死代码消除

**统计**: `src/tools.ts` 25 次 `require()`, `src/commands.ts` 18 次 `require()`

```mermaid
flowchart TD
    subgraph 模式["三种懒加载模式"]
        FEAT_GUARD["特性门控懒加载<br/>feature('X') ? require() : null"]
        ENV_GUARD["环境变量懒加载<br/>USER_TYPE=ant ? require() : null"]
        CIRCULAR["循环依赖打破<br/>const getX = () => require('X')"]
    end

    subgraph 效果["效果"]
        STARTUP["启动时间优化<br/>不加载未使用模块"]
        BUNDLE["包体积缩小<br/>外部构建不含内部功能"]
        SAFETY["类型安全<br/>as typeof import() 类型断言"]
    end

    FEAT_GUARD --> STARTUP & BUNDLE
    ENV_GUARD --> BUNDLE
    CIRCULAR --> SAFETY
```

---

## 6. 权限规则解析

**文件**: `src/utils/permissions/permissionRuleParser.ts`

```mermaid
flowchart TD
    RULE["权限规则字符串"] --> PARSE["parsePermissionRule()"]

    PARSE --> FORMAT{"格式?"}
    FORMAT -->|"'ToolName'"| BLANKET["全局规则<br/>(匹配所有输入)"]
    FORMAT -->|"'Tool(content)'"| CONTENT["内容规则<br/>(匹配特定输入)"]
    FORMAT -->|"'Tool(pattern*)'"| WILDCARD["通配符规则"]

    subgraph 转义["转义处理"]
        ESC1["\\  → \\\\"]
        ESC2["(  → \\("]
        ESC3[")  → \\)"]
    end

    subgraph 别名["工具名别名"]
        LEGACY["Task → AgentTool"]
        BRIEF_ALIAS["Brief → BriefTool (门控)"]
    end

    subgraph 匹配示例["匹配示例"]
        EX1["'Bash(git *)' → git status ✓, rm -rf ✗"]
        EX2["'Read' → 所有 Read 操作 ✓"]
        EX3["'mcp__server' → 该服务器所有工具 ✓"]
    end
```

---

## 7. 分析事件模式

**统计**: `logEvent()` 1041 次 (250 文件)

```mermaid
flowchart TD
    EVENT["logEvent(name, props)"]

    EVENT --> QUEUE{"已初始化?"}
    QUEUE -->|否| BUFFER["事件队列<br/>(零依赖启动)"]
    QUEUE -->|是| SINK["事件接收器"]

    BUFFER -->|"attachAnalyticsSink()"| SINK

    SINK --> PII{"PII 处理"}
    PII --> PROTO["_PROTO_* 键<br/>→ 受限 PII 列"]
    PII --> NORMAL["普通键<br/>→ 标准列"]

    SINK --> ROUTE["路由"]
    ROUTE --> DD["Datadog"]
    ROUTE --> FP["第一方日志"]

    subgraph 类型安全["类型安全"]
        VERIFIED["AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS"]
        PII_TAG["AnalyticsMetadata_I_VERIFIED_THIS_IS_PII_TAGGED"]
    end
```

---

## 8. Signal / Store 双模式

```mermaid
graph LR
    subgraph Signal["Signal (事件信号)"]
        S_API["createSignal&lt;Args&gt;()"]
        S_SUB["subscribe(listener)"]
        S_EMIT["emit(...args)"]
        S_CLEAR["clear()"]
        S_NOTE["无状态快照<br/>纯事件通知"]
    end

    subgraph Store["Store (响应式状态)"]
        ST_API["createStore&lt;T&gt;(initial)"]
        ST_GET["getState(): T"]
        ST_SET["setState(updater)"]
        ST_SUB["subscribe(listener)"]
        ST_NOTE["有状态快照<br/>Object.is() 恒等检查"]
    end

    subgraph 使用["使用场景"]
        SIG_USE["Signal: 设置变化、权限改变"]
        STO_USE["Store: AppState (全局 UI 状态)"]
    end

    Signal --> SIG_USE
    Store --> STO_USE
```

---

## 9. 顺序执行包装

**文件**: `src/utils/sequential.ts` (57 行), 33 个文件使用

```mermaid
sequenceDiagram
    participant C1 as 调用者 1
    participant C2 as 调用者 2
    participant SEQ as sequential(fn)
    participant FN as 原始函数

    C1->>SEQ: 请求 A
    SEQ->>FN: 执行 A
    
    C2->>SEQ: 请求 B (排队)
    Note over SEQ: FIFO 队列<br/>处理标志防重入

    FN-->>SEQ: 结果 A
    SEQ-->>C1: Promise resolve(A)

    SEQ->>FN: 执行 B
    FN-->>SEQ: 结果 B
    SEQ-->>C2: Promise resolve(B)

    Note over SEQ: 错误单独 reject<br/>不影响后续项
```

**使用场景**: 文件写入、日志追加、会话持久化、MCP 客户端操作

---

## 10. 优雅降级

```mermaid
flowchart TD
    subgraph fail_open["Fail-Open 模式"]
        POLICY["策略限制: API 失败 → 允许"]
        GROVE["Grove: 冷启动 → 跳过"]
        METRICS["指标: 网络错误 → 用旧值"]
        BOOT["Bootstrap: 失败 → 用缓存"]
    end

    subgraph graceful_shutdown["优雅关闭"]
        WAIT_TASKS["等待后台任务完成"]
        CLEAN_RES["清理资源"]
        FLUSH_LOG["刷新日志"]
        EXIT["退出"]
    end

    subgraph backward_compat["向后兼容"]
        MEM_TYPE["未知 memory type → 降级"]
        KEYBIND["未迁移快捷键 → fallback 文本"]
        PATH_ERR["PathTraversalError → 跳过条目"]
    end
```

---

## 工程原则总结

```mermaid
graph TD
    subgraph 5原则["5 个核心工程原则"]
        P1["隔离优先<br/>子代理克隆状态<br/>缓存恒等检查<br/>权限包装"]
        P2["可观测性<br/>logEvent() 1041次<br/>每个后台操作有事件<br/>PII 分离"]
        P3["内存安全<br/>LRU 100条 / 25MB<br/>TTL 5分钟刷新<br/>事件驱动清除"]
        P4["缓存一致性<br/>CacheSafeParams<br/>系统提示字节一致<br/>工具集完全匹配"]
        P5["渐进式增强<br/>feature() 960次<br/>条件 require()<br/>GrowthBook A/B"]
    end
```

### 数量统计

| 模式 | 使用文件数 | 核心实现 | 调用次数 |
|------|-----------|---------|---------|
| TTL/LRU 缓存 | 7 | memoize.ts (270行) | - |
| 分叉代理 | 22 | forkedAgent.ts (690行) | - |
| `feature()` | 212 | bun:bundle 宏 | 960 |
| `getFeatureValue()` | 109 | growthbook.ts | 284 |
| `logError()` | 241 | errors.ts | 908 |
| `logEvent()` | 250 | analytics/index.ts | 1041 |
| `toError()` | 59 | errors.ts | 159 |
| `sequential()` | 33 | sequential.ts (57行) | - |
| `require()` 懒加载 | 2 核心 | tools.ts + commands.ts | 43 |
