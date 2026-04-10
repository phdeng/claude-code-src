# 12 - 辅助子系统

## 内存系统 (memdir/)

```mermaid
graph TB
    subgraph 内存架构["内存系统架构"]
        MEMDIR["memdir.ts<br/>核心目录"]
        PATHS["paths.ts<br/>路径管理"]
        TEAM_PATHS["teamMemPaths.ts<br/>团队路径"]
        SCAN["memoryScan.ts<br/>内存扫描"]
        FIND["findRelevantMemories.ts<br/>相关性查找"]
        AGE["memoryAge.ts<br/>年龄追踪"]
        TYPES["memoryTypes.ts<br/>类型定义"]
        PROMPTS["teamMemPrompts.ts<br/>团队提示"]
    end

    subgraph 存储["存储位置"]
        USER_MEM["~/.claude/memory/<br/>用户记忆"]
        PROJECT_MEM[".claude/memory/<br/>项目记忆"]
        MEMORY_MD["MEMORY.md<br/>记忆索引 (最大 200 行)"]
    end

    subgraph 限制["系统限制"]
        MAX_ENTRIES["最大 100 条记忆"]
        MAX_PASTE["最大粘贴 1024 字符"]
        MAX_INDEX["索引最大 25KB"]
    end

    MEMDIR --> SCAN
    SCAN --> FIND
    FIND --> TYPES
    MEMDIR --> PATHS
    MEMDIR --> TEAM_PATHS
    MEMDIR --> AGE
    
    PATHS --> USER_MEM
    PATHS --> PROJECT_MEM
    TEAM_PATHS --> MEMORY_MD
```

## 协调器模式 (coordinator/)

```mermaid
flowchart TD
    CHECK["isCoordinatorMode()"]
    CHECK -->|"CLAUDE_CODE_COORDINATOR_MODE"| ENABLED["协调器启用"]
    
    ENABLED --> COORD_PROMPT["getCoordinatorSystemPrompt()"]
    COORD_PROMPT --> RESPONSIBILITIES["协调器职责"]
    
    RESPONSIBILITIES --> R1["研究 - 收集信息"]
    RESPONSIBILITIES --> R2["合成 - 整合分析"]
    RESPONSIBILITIES --> R3["委派 - 分配任务给工作者"]
    RESPONSIBILITIES --> R4["验证 - 检查结果"]
    
    ENABLED --> WORKER_CTX["getCoordinatorUserContext()"]
    WORKER_CTX --> W_TOOLS["工作者可用工具"]
    WORKER_CTX --> W_MCP["MCP 服务器列表"]
    WORKER_CTX --> W_SCRATCH["Scratchpad 目录"]
    
    subgraph 工作者工具["工作者工具集"]
        SIMPLE_W["简单模式:<br/>Bash + Read + Edit + MCP"]
        FULL_W["完整模式:<br/>所有异步代理工具<br/>- 内部工具"]
    end

    W_TOOLS --> SIMPLE_W & FULL_W
```

```mermaid
sequenceDiagram
    participant User as 用户
    participant Coord as 协调器
    participant Worker1 as 工作者 A
    participant Worker2 as 工作者 B

    User->>Coord: 复杂任务

    Coord->>Coord: 分析和规划
    
    par 并行委派
        Coord->>Worker1: AgentTool: 子任务 1
        Coord->>Worker2: AgentTool: 子任务 2
    end
    
    Worker1-->>Coord: task-notification (结果 1)
    Worker2-->>Coord: task-notification (结果 2)
    
    Coord->>Coord: 合成结果
    Coord->>Coord: 验证完整性
    Coord-->>User: 最终结果
```

## 钩子系统 (schemas/hooks.ts)

```mermaid
graph TD
    subgraph 钩子类型["四种钩子类型"]
        CMD_HOOK["command 钩子<br/>执行 Shell 命令"]
        PROMPT_HOOK["prompt 钩子<br/>发送提示给模型"]
        HTTP_HOOK["http 钩子<br/>发送 HTTP 请求"]
        AGENT_HOOK["agent 钩子<br/>验证代理"]
    end

    subgraph 触发时机["触发事件"]
        PRE_TOOL["工具执行前"]
        POST_TOOL["工具执行后"]
        PRE_COMPACT["压缩前"]
        POST_COMPACT["压缩后"]
        SESSION_START["会话开始"]
        PERM_REQUEST["权限请求"]
    end

    subgraph 条件过滤["条件过滤"]
        IF_RULE["if 条件<br/>'Bash(git *)'<br/>'Read(*.ts)'"]
        ONCE_FLAG["once 标志<br/>只执行一次"]
        TIMEOUT["timeout<br/>超时控制"]
    end

    PRE_TOOL & POST_TOOL --> CMD_HOOK & PROMPT_HOOK & HTTP_HOOK & AGENT_HOOK
    PRE_COMPACT & POST_COMPACT --> CMD_HOOK & PROMPT_HOOK
    SESSION_START --> CMD_HOOK & PROMPT_HOOK
    
    CMD_HOOK & PROMPT_HOOK & HTTP_HOOK & AGENT_HOOK --> IF_RULE
    IF_RULE --> ONCE_FLAG
    ONCE_FLAG --> TIMEOUT
```

## 语音系统 (voice/)

```mermaid
flowchart TD
    CHECK_V["isVoiceModeEnabled()"]
    
    CHECK_V --> GB{"GrowthBook 开关?"}
    GB -->|"禁用"| DISABLED["语音不可用"]
    GB -->|"启用"| AUTH{"语音认证?"}
    
    AUTH -->|"无认证"| DISABLED
    AUTH -->|"已认证"| ENABLED["语音模式可用"]
    
    ENABLED --> HOOK_V["useVoice Hook"]
    HOOK_V --> STT["voiceStreamSTT.ts<br/>语音转文字"]
    HOOK_V --> KEYTERMS["voiceKeyterms.ts<br/>关键词检测"]
    HOOK_V --> INTEGRATION["useVoiceIntegration<br/>集成 Hook (99KB)"]
    
    STT --> AUDIO["音频流捕获"]
    AUDIO --> PROCESS["语音处理"]
    PROCESS --> TEXT["转换为文本"]
    TEXT --> INPUT["输入到 REPL"]
```

## Buddy 伴侣系统 (buddy/)

```mermaid
graph TD
    BUDDY["Buddy 系统"]
    
    BUDDY --> COMPANION["companion.ts<br/>伴侣逻辑"]
    BUDDY --> SPRITES["sprites.ts<br/>精灵数据"]
    BUDDY --> COMP_SPR["CompanionSprite.tsx<br/>精灵组件"]
    BUDDY --> NOTIFY["useBuddyNotification.tsx<br/>通知 Hook"]
    BUDDY --> PROMPT_B["prompt.ts<br/>伴侣提示"]
    
    COMPANION --> PRNG["Mulberry32 PRNG<br/>确定性随机"]
    PRNG --> SPECIES["物种生成"]
    PRNG --> TRAITS["特性生成"]
    PRNG --> RARITY["稀有度"]
    
    SPECIES --> DISPLAY["显示精灵"]
    TRAITS --> DISPLAY
    RARITY --> DISPLAY
    
    subgraph 类型["Companion 类型"]
        COMP_TYPE["Companion"]
        BONES["CompanionBones"]
        EYES["眼睛样式"]
        HATS["帽子样式"]
    end
```

## 插件系统 (plugins/)

```mermaid
flowchart TD
    subgraph 插件定义["BuiltinPluginDefinition"]
        NAME["name: string"]
        DESC["description: string"]
        VER["version: string"]
        DEFAULT_EN["defaultEnabled?: boolean"]
        AVAILABLE["isAvailable?() boolean"]
        HOOK_DEF["hooks?: HooksSettings"]
        MCP_DEF["mcpServers?: MCPServerDefinition[]"]
        SKILL_DEF["skills?: BundledSkillDefinition[]"]
    end

    subgraph 生命周期["插件生命周期"]
        REGISTER["registerBuiltinPlugin()"]
        LOAD["getBuiltinPlugins()"]
        ENABLE["用户启用/禁用<br/>/plugin 命令"]
        PERSIST["持久化到设置"]
    end

    subgraph 提供能力["插件可提供"]
        P_SKILLS["技能 (Skills)"]
        P_HOOKS["钩子 (Hooks)"]
        P_MCP["MCP 服务器"]
        P_COMMANDS["命令 (Commands)"]
    end

    REGISTER --> LOAD
    LOAD --> ENABLE
    ENABLE --> PERSIST
    
    LOAD --> P_SKILLS & P_HOOKS & P_MCP & P_COMMANDS
```

## 输入处理管道 (utils/processUserInput/)

```mermaid
flowchart TD
    RAW["原始用户输入"]
    
    RAW --> DETECT{"输入类型?"}
    
    DETECT -->|"/ 前缀"| SLASH["斜杠命令解析"]
    DETECT -->|"文本"| TEXT_PROC["文本处理"]
    DETECT -->|"图片粘贴"| IMG["图片处理"]
    DETECT -->|"文件附件"| ATT["附件处理"]
    
    SLASH --> FIND_CMD["findCommand()"]
    FIND_CMD --> CMD_EXEC["命令执行"]
    
    TEXT_PROC --> BUILD_MSG["构建 UserMessage"]
    IMG --> BUILD_MSG
    ATT --> BUILD_MSG
    
    BUILD_MSG --> MODEL_SELECT["模型选择"]
    MODEL_SELECT --> EFFORT["effort 参数应用"]
    EFFORT --> SUBMIT["提交给 QueryEngine"]
```

## 迁移系统 (migrations/)

```mermaid
graph LR
    subgraph 模型迁移["模型迁移"]
        M1["Fennec → Opus"]
        M2["Legacy Opus → Current"]
        M3["Opus → Opus 1M"]
        M4["Sonnet 1M → Sonnet 4.5"]
        M5["Sonnet 4.5 → Sonnet 4.6"]
        M6["Pro → Opus Default"]
        
        M1 --> M2 --> M3
        M4 --> M5
    end

    subgraph 配置迁移["配置迁移"]
        C1["Auto Updates → Settings"]
        C2["Bypass Permissions → Settings"]
        C3["MCP Servers → Settings"]
        C4["REPL Bridge → Remote Control"]
        C5["Auto Mode Opt-in Reset"]
    end

    BOOT["启动时执行"] --> 模型迁移
    BOOT --> 配置迁移
    
    style BOOT fill:#f96
```

## 上游代理 (upstreamproxy/)

```mermaid
flowchart TD
    CCR["CCR 容器环境"]
    
    CCR --> PROXY["upstreamproxy.ts<br/>MITM 代理"]
    
    PROXY --> TOKEN["读取会话令牌<br/>/run/ccr/session_token"]
    PROXY --> PRCTL["设置 prctl"]
    PROXY --> CA["CA 证书配置"]
    
    PROXY --> CONNECT["CONNECT 方法"]
    CONNECT --> WS_RELAY["WebSocket 中继"]
    
    PROXY --> RELAY["relay.ts<br/>本地 CONNECT 中继"]
    
    subgraph 环境变量["相关环境变量"]
        HTTPS_PROXY["HTTPS_PROXY"]
        SSL_CERT["SSL_CERT_FILE"]
    end
    
    PROXY --> HTTPS_PROXY & SSL_CERT
```

## 文件状态缓存

```mermaid
flowchart TD
    CACHE["FileStateCache"]
    
    CACHE --> SNAPSHOT["文件内容快照"]
    CACHE --> PREVENT["防止重复读取"]
    CACHE --> OPTIMIZE["优化 API Token"]
    CACHE --> ROLLBACK["支持回滚"]
    
    subgraph 使用者["使用者"]
        FR["FileReadTool"]
        FE["FileEditTool"]
        FW["FileWriteTool"]
        QE_C["QueryEngine"]
    end
    
    FR -->|"读取后缓存"| CACHE
    FE -->|"编辑后更新"| CACHE
    FW -->|"写入后更新"| CACHE
    QE_C -->|"跨调用共享"| CACHE
```
