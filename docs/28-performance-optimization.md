# 28 - 性能优化技术目录

> 从源码提取的所有性能优化技术，附具体阈值参数和文件位置。

---

## 优化技术总览

```mermaid
graph TD
    subgraph 启动优化["启动优化"]
        PRECONNECT["API 预连接<br/>省 100-200ms"]
        EARLY_INPUT["早期输入捕获<br/>UI 未就绪即可打字"]
        LAZY_LOAD["懒加载 43+ require()<br/>减少初始化"]
        FAST_PATH["快速路径<br/>--version 零加载"]
        PARALLEL_INIT["并行初始化<br/>MDM+Keychain+GrowthBook"]
    end

    subgraph 缓存优化["缓存优化"]
        PROMPT_CACHE["提示缓存分区<br/>static/dynamic 分界"]
        FORK_CACHE["分叉缓存共享<br/>CacheSafeParams"]
        TOOL_CACHE["工具 schema 缓存<br/>会话级稳定"]
        CHAR_CACHE["字符缓存<br/>16384 行 Ink 渲染"]
        MD_CACHE["Markdown Token 缓存<br/>500 条 MRU"]
        SETTINGS_CACHE["设置三层缓存"]
    end

    subgraph 运行时优化["运行时优化"]
        TOOL_PARALLEL["工具并行<br/>读 10 并发/写串行"]
        VIRTUAL_SCROLL["虚拟滚动<br/>300 项上限"]
        MICRO_COMPACT["微压缩<br/>选择性工具结果"]
        TOOL_SEARCH["工具搜索延迟加载<br/>仅超阈值时启用"]
        BLIT["增量渲染<br/>TypedArray blitting"]
    end

    subgraph 后台优化["后台优化"]
        BG_REFRESH["后台缓存刷新<br/>(非阻塞)"]
        SAMPLING["分析采样<br/>外部 0.5%"]
        PREVENT_SLEEP["防休眠自修复<br/>caffeinate 引用计数"]
        SEQUENTIAL["顺序执行包装<br/>防竞态"]
    end
```

---

## 1. 启动时间优化

### API 预连接

**文件**: `src/utils/apiPreconnect.ts`

```mermaid
sequenceDiagram
    participant Boot as 启动
    participant Pre as apiPreconnect
    participant API as Anthropic API

    Boot->>Boot: init.ts 完成
    Note over Boot: settings.json + TLS 证书已就绪

    Boot->>Pre: preconnectToApi()
    Pre->>API: HEAD 请求 (fire-and-forget)
    Note over Pre: TCP + TLS 握手<br/>省 100-200ms
    Note over Pre: 超时: 10s<br/>keep-alive 复用

    Pre->>Pre: 跳过条件检查
    Note over Pre: ✗ Bedrock/Vertex/Foundry<br/>✗ 代理/mTLS/Unix socket
```

### 快速路径

```mermaid
flowchart TD
    START["claude CLI"] --> CHECK{"参数?"}
    CHECK -->|"--version"| VER["零模块加载<br/>输出版本号"]
    CHECK -->|"--dump-system-prompt"| DUMP["仅加载提示模块"]
    CHECK -->|"--daemon-worker"| DAEMON["轻量工作器"]
    CHECK -->|"标准"| FULL["完整加载"]

    style VER fill:#dfd
    style DUMP fill:#ffd
```

### 并行初始化

```mermaid
gantt
    title 启动并行初始化 (示意)
    dateFormat X
    axisFormat %s

    section 串行
    参数解析           :a1, 0, 2

    section 并行 (第一波)
    MDM 设置读取       :b1, 2, 5
    钥匙串预取         :b2, 2, 4
    GrowthBook 初始化  :b3, 2, 6

    section 串行
    全局状态初始化      :c1, 6, 8

    section 并行 (第二波)
    MCP 服务器连接     :d1, 8, 14
    插件加载           :d2, 8, 12
    API 预连接         :d3, 8, 9

    section 串行
    Ink 渲染           :e1, 14, 16
```

---

## 2. 提示缓存优化

### 系统提示分区

**文件**: `src/constants/prompts.ts`, `src/utils/api.ts`

```mermaid
graph TD
    subgraph 缓存分区["系统提示缓存分区"]
        HEADER["Attribution Header<br/>scope: null (不缓存)"]
        PREFIX["CLI 前缀识别<br/>scope: 'org' 或 'global'"]
        STATIC["静态内容<br/>(DYNAMIC_BOUNDARY 之前)<br/>scope: 'global'"]
        DYNAMIC["动态内容<br/>(DYNAMIC_BOUNDARY 之后)<br/>scope: null"]
    end

    API_REQ["API 请求"] --> SPLIT["splitSysPromptPrefix()"]
    SPLIT --> HEADER
    SPLIT --> PREFIX
    SPLIT --> STATIC
    SPLIT --> DYNAMIC

    subgraph 效果["缓存效果"]
        GLOBAL["全局缓存<br/>跨组织共享"]
        ORG["组织缓存<br/>同组织共享"]
        NONE["不缓存<br/>每次重新计算"]
    end

    STATIC --> GLOBAL
    PREFIX --> ORG
    DYNAMIC --> NONE
```

### 分叉代理缓存共享

```
CacheSafeParams 保证:
  系统提示 (相同字节) ✓
  工具集 (相同 schema) ✓
  模型 (相同) ✓
  消息前缀 (相同) ✓
  思考配置 (相同) ✓
  → 父子代理共享提示缓存
  → 避免重复 cache_creation token
```

### 缓存破裂检测

```
检测条件: cache_read 下降 > 5% 且绝对值 > 2000 tokens
诊断原因: 系统提示变化 | 工具增减 | 模型切换 | 快速模式 | TTL 过期
输出: ~/.claude/cache-break-*.diff
```

---

## 3. 工具执行优化

### 并发执行模型

```mermaid
flowchart TD
    CALLS["N 个工具调用"] --> PARTITION["分区"]

    PARTITION --> READ["只读工具<br/>(FileRead, Glob, Grep,<br/>WebFetch, WebSearch)"]
    PARTITION --> WRITE["写入工具<br/>(FileEdit, Bash, FileWrite)"]

    READ --> CONCURRENT["并发执行"]
    CONCURRENT --> LIMIT["最多 10 个<br/>MAX_TOOL_USE_CONCURRENCY"]

    WRITE --> SERIAL["串行执行"]
    SERIAL --> MUTEX["互斥访问"]

    subgraph 配置["环境变量配置"]
        ENV["CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY<br/>默认 10"]
    end
```

### 工具搜索延迟加载

```mermaid
flowchart TD
    CHECK["工具总数"] --> ESTIMATE["估算 token 占比"]
    ESTIMATE --> THRESHOLD{"超过上下文 N%?<br/>(默认 10%)"}

    THRESHOLD -->|是| DEFER["启用 ToolSearch<br/>仅发送核心工具 schema"]
    THRESHOLD -->|否| ALL["发送所有工具 schema"]

    DEFER --> ON_DEMAND["模型按需查询<br/>ToolSearchTool"]

    subgraph 估算["MCP 工具大小估算"]
        RATIO["2.5 字符/token"]
    end

    subgraph 配置["配置"]
        AUTO["ENABLE_TOOL_SEARCH=auto:N"]
        FORCE["ENABLE_TOOL_SEARCH=true"]
    end
```

---

## 4. 渲染优化

### 虚拟滚动

**文件**: `src/hooks/useVirtualScroll.ts`

```mermaid
graph TD
    subgraph 参数["关键参数"]
        P1["DEFAULT_ESTIMATE = 3<br/>未测量项高度估算"]
        P2["OVERSCAN_ROWS = 80<br/>视口外额外渲染"]
        P3["COLD_START_COUNT = 30<br/>初始预渲染"]
        P4["SCROLL_QUANTUM = 40<br/>滚动量化步长"]
        P5["MAX_MOUNTED_ITEMS = 300<br/>挂载上限"]
        P6["PESSIMISTIC_HEIGHT = 1<br/>最小高度"]
    end

    subgraph 优化策略["优化策略"]
        S1["滚动量化<br/>每 40 行才触发 React 提交"]
        S2["物理滚动独立<br/>ScrollBox.forceRender"]
        S3["冷启动预渲染<br/>30 项初始挂载"]
        S4["批量挂载限制<br/>防纤维爆炸"]
    end
```

### Ink 渲染引擎

```mermaid
flowchart TD
    subgraph 字符缓存["charCache"]
        CC_SIZE["最多 16384 行"]
        CC_AVOID["避免重复<br/>tokenize + grapheme 聚类"]
    end

    subgraph 双缓冲["双缓冲 blitting"]
        DB_DIFF["仅渲染变化区域"]
        DB_BATCH["TypedArray.set() 批量复制"]
    end

    subgraph Markdown["Markdown 快速路径"]
        MD_CACHE_SIZE["TOKEN_CACHE = 500 条<br/>MRU 驱逐"]
        MD_SAMPLE["前 500 字符采样<br/>无语法 → 跳过 lexer"]
        MD_SAVE["纯文本跳过: 省 ~3ms"]
    end
```

---

## 5. 压缩优化

### 六层压缩管线

```mermaid
flowchart TD
    subgraph 层级["由轻到重"]
        L1["L1: History Snip<br/>删除旧工具结果<br/>(最轻)"]
        L2["L2: Microcompact<br/>6 类工具选择性压缩"]
        L3["L3: Context Collapse<br/>项目级背景摘要"]
        L4["L4: Reactive Compact<br/>动态消息压缩"]
        L5["L5: AutoCompact<br/>Fork Agent 全量摘要"]
        L6["L6: Session Memory<br/>后台会话摘要<br/>(最重)"]
    end

    L1 -->|"不够"| L2
    L2 -->|"不够"| L3
    L3 -->|"不够"| L4
    L4 -->|"不够"| L5
    L5 -->|"不够"| L6
```

### Microcompact 参数

```
覆盖工具: Bash, Grep, Glob, WebSearch, WebFetch, FileEdit/Write
图像 token 限制: IMAGE_MAX_TOKEN_SIZE = 2000
时间基础阈值: gapThresholdMinutes = 60 (1 小时)
保留最近: keepRecent = 5
```

### AutoCompact 参数

```
触发阈值: 有效窗口 - 13K tokens
警告阈值: 有效窗口 - 20K tokens
阻塞阈值: 有效窗口 - 3K tokens
断路器: 连续失败 ≥ 3 次停止
摘要保留: 20K tokens
```

---

## 6. 内存管理

### LRU 缓存控制

```mermaid
graph TD
    subgraph FileState["文件状态缓存"]
        FS_CAP["容量: 100 条目"]
        FS_SIZE["大小: 25MB"]
        FS_EVICT["超限驱逐最旧"]
    end

    subgraph Memoize["TTL 缓存"]
        M_TTL["默认 TTL: 5 分钟"]
        M_STALE["过期返回旧值<br/>后台异步刷新"]
        M_STAMPEDE["refreshing 标志<br/>防雷鸣羊群"]
    end

    subgraph ErrorRing["错误环形缓冲区"]
        E_CAP["容量: 100 条"]
        E_FIFO["FIFO 驱逐"]
    end

    subgraph Memory["MEMORY.md"]
        MEM_LINES["最多 200 行"]
        MEM_BYTES["最多 25KB"]
    end
```

---

## 7. 分析采样

**文件**: `src/utils/startupProfiler.ts`

```mermaid
flowchart TD
    USER{"用户类型?"} -->|Ant 内部| FULL["100% 采样"]
    USER -->|外部用户| SAMPLE["0.5% 采样<br/>STATSIG_SAMPLE_RATE = 0.005"]

    ENV{"CLAUDE_CODE_PROFILE_STARTUP=1?"} -->|是| DETAIL["详细模式<br/>+ 内存快照"]
    ENV -->|否| NORMAL["标准模式"]

    FULL & SAMPLE --> STATSIG["发送到 Statsig"]
    DETAIL --> CONSOLE["输出到控制台"]
```

---

## 8. 防休眠自修复

```
caffeinate 超时: 300s (5 分钟)
重启间隔: 240s (4 分钟)
引用计数: 支持嵌套 start/stop
自修复: SIGKILL 后孤立进程 5 分钟自动退出
Unref: 不阻止 Node 退出
```

---

## 关键阈值速查表

| 组件 | 参数 | 值 | 位置 |
|------|------|-----|------|
| 工具并发 | MAX_CONCURRENT | 10 | toolOrchestration.ts |
| 虚拟滚动 | MAX_MOUNTED | 300 | useVirtualScroll.ts |
| 虚拟滚动 | SCROLL_QUANTUM | 40 行 | useVirtualScroll.ts |
| 虚拟滚动 | COLD_START | 30 项 | useVirtualScroll.ts |
| 虚拟滚动 | OVERSCAN | 80 行 | useVirtualScroll.ts |
| 字符缓存 | MAX_LINES | 16384 | ink/output.ts |
| Markdown | TOKEN_CACHE | 500 条 | Markdown.tsx |
| 文件缓存 | MAX_ENTRIES | 100 | fileStateCache.ts |
| 文件缓存 | MAX_SIZE | 25MB | fileStateCache.ts |
| 错误缓冲 | MAX_ERRORS | 100 | log.ts |
| 记忆索引 | MAX_LINES | 200 | memdir.ts |
| 记忆索引 | MAX_BYTES | 25KB | memdir.ts |
| TTL 缓存 | DEFAULT | 5 分钟 | memoize.ts |
| 微压缩 | IMAGE_MAX | 2000 tokens | microCompact.ts |
| 微压缩 | GAP_THRESHOLD | 60 分钟 | timeBasedMCConfig.ts |
| 自动压缩 | BUFFER | 13K tokens | autoCompact.ts |
| 自动压缩 | BREAKER | 3 次 | autoCompact.ts |
| API 预连接 | TIMEOUT | 10s | apiPreconnect.ts |
| 防休眠 | CAFFEINATE | 300s | preventSleep.ts |
| 采样率 | EXTERNAL | 0.5% | startupProfiler.ts |
| Unicode | MAX_ITER | 10 次 | sanitization.ts |
| 否决追踪 | CONSECUTIVE | 3 | denialTracking.ts |
| 否决追踪 | TOTAL | 20 | denialTracking.ts |
| 工具搜索 | AUTO_THRESHOLD | 10% | toolSearch.ts |
| 工具结果 | MAX_SIZE | 50KB | toolResultStorage.ts |
| 文件上传 | MAX_FILE | 500MB | filesApi.ts |
| 文件上传 | CONCURRENCY | 5 | filesApi.ts |
