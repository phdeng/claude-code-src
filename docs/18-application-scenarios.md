# 18 - 应用场景分析

> 从源码中归类出的 20 个核心应用场景，覆盖智能后台系统、知识管理、上下文优化、安全控制等。

---

## 场景总览

```mermaid
mindmap
  root((Claude Code<br/>应用场景))
    智能加速
      推测执行 Speculation
      提示词推荐 PromptSuggestion
    知识管理
      自动梦想 AutoDream
      内存提取 ExtractMemories
      会话内存 SessionMemory
      魔法文档 MagicDocs
    上下文管理
      自动压缩 AutoCompact
      文件状态缓存 FileStateCache
      会话内存压缩
    安全与策略
      组织策略 PolicyLimits
      Bash 沙箱 Sandbox
      OAuth 认证
    用户体验
      输出风格 OutputStyles
      Vim 模式
      快捷键 Keybindings
    开发流程
      工作树隔离 Worktree
      对话恢复 Recovery
      模型选择 ModelSelection
    系统协议
      用户输入管道
      附件系统
      SDK 结构化 I/O
```

---

## 1. 推测执行 (Speculation)

**文件**: `src/services/PromptSuggestion/speculation.ts`

```mermaid
sequenceDiagram
    participant User as 用户 (打字中)
    participant Suggest as PromptSuggestion
    participant Overlay as Copy-on-Write 隔离层
    participant Fork as Forked Agent

    User->>Suggest: 当前轮次结束
    Suggest->>Fork: 生成下一步建议<br/>(共享父级 prompt cache)
    Fork->>Overlay: 在 .claude/speculation/{pid}/{id}/ 执行
    Note over Overlay: 允许: Read, Grep, Glob,<br/>只读 Bash, Edit/Write
    Note over Overlay: 禁止: 非只读 Bash, 网络, 权限提示

    Fork-->>Suggest: 推测结果

    alt 用户接受建议 (Tab)
        Suggest->>User: 即时注入结果 ⚡
        Note over Suggest: 管道化: 立即生成下一轮建议
    else 用户忽略
        Suggest->>Overlay: 丢弃 overlay
    end
```

**限制**: 最多 20 轮 / 100 条消息，仅 Ant 内部用户

---

## 2. 自动梦想 (AutoDream)

**文件**: `src/services/autoDream/`

```mermaid
flowchart TD
    TRIGGER["会话结束"] --> SCAN{"扫描节流<br/>10 分钟内最多 1 次"}
    SCAN --> TIME{"距上次 ≥ 24h?"}
    TIME -->|否| SKIP["跳过"]
    TIME -->|是| SESSION{"会话数 ≥ 5?"}
    SESSION -->|否| SKIP
    SESSION -->|是| LOCK["获取锁<br/>.consolidate-lock"]

    LOCK --> PID{"锁 PID 仍存活?"}
    PID -->|"是 (非自己)"| SKIP
    PID -->|"否 / 过期 >1h"| ACQUIRE["获取锁 (写入 PID)"]

    ACQUIRE --> DREAM["启动 /dream Agent"]
    DREAM --> PHASE1["Phase 1: 定向<br/>ls memory/, 读 MEMORY.md"]
    PHASE1 --> PHASE2["Phase 2: 收集信号<br/>grep transcript JSONL"]
    PHASE2 --> PHASE3["Phase 3: 巩固<br/>编辑/创建记忆文件"]
    PHASE3 --> PHASE4["Phase 4: 修剪<br/>删除过时记忆"]
    PHASE4 --> NOTIFY["系统消息:<br/>'Improved N memories'"]
```

---

## 3. 内存提取 (ExtractMemories)

**文件**: `src/services/extractMemories/`

```mermaid
stateDiagram-v2
    [*] --> 等待
    等待 --> 检查 : 主 agent 轮次结束

    state 检查 {
        [*] --> 门控检查
        门控检查 --> 节流检查 : 通过
        节流检查 --> 互斥检查 : 通过
        互斥检查 --> [*] : 通过
    }

    检查 --> 跳过 : 任一检查失败
    检查 --> 提取中 : 全部通过

    state 提取中 {
        [*] --> 扫描内存目录
        扫描内存目录 --> Forked_Agent
        Forked_Agent --> 读文件_并行
        读文件_并行 --> 写文件_并行
        写文件_并行 --> [*]
    }

    提取中 --> 推进光标
    推进光标 --> 尾随检查

    state 尾随检查 {
        [*] --> 有新消息?
        有新消息? --> 执行尾随提取 : 是
        有新消息? --> [*] : 否
    }

    尾随检查 --> 等待
```

**关键状态**: `lastMemoryMessageUuid` (光标)、`inFlightExtractions` (并发追踪)、`turnsSinceLastExtraction` (节流计数器)

---

## 4. 魔法文档 (MagicDocs)

**文件**: `src/services/MagicDocs/`

```mermaid
flowchart TD
    READ["用户读取文件"] --> DETECT{"文件头包含<br/># MAGIC DOC: [title]?"}
    DETECT -->|否| IGNORE["忽略"]
    DETECT -->|是| TRACK["开始追踪该文件"]

    TRACK --> IDLE{"对话 idle?<br/>(最后一轮无 tool calls)"}
    IDLE -->|否| WAIT["等待"]
    IDLE -->|是| UPDATE["触发更新"]

    UPDATE --> REREAD["重新读取文件内容"]
    REREAD --> AGENT["启动 Agent (model=sonnet)"]
    AGENT --> EDIT["Edit 工具更新文件"]

    EDIT --> RULES["更新规则:<br/>- 保留 header<br/>- 就地更新 (非 changelog)<br/>- 删除过时部分<br/>- 修复格式错误<br/>- BE TERSE"]
```

---

## 5. 自动压缩 (AutoCompact)

**文件**: `src/services/compact/autoCompact.ts`

```mermaid
flowchart TD
    CHECK["每轮结束检查 token 数"]

    CHECK --> THRESHOLD{"当前 tokens ≥<br/>有效窗口 - 13K?"}
    THRESHOLD -->|否| OK["继续对话"]
    THRESHOLD -->|是| TRY_SM["尝试 Session Memory 压缩"]

    TRY_SM --> SM_RESULT{"减少足够 tokens?"}
    SM_RESULT -->|是| OK
    SM_RESULT -->|否| STANDARD["标准对话压缩"]

    STANDARD --> FORK_AGENT["Forked Agent 生成 summary"]
    FORK_AGENT --> CLEANUP["postCompactCleanup()<br/>重置 cache 基线"]

    STANDARD --> BREAKER{"连续失败 ≥ 3 次?"}
    BREAKER -->|是| STOP["断路器: 停止重试"]
    BREAKER -->|否| RETRY["下轮重试"]

    subgraph 阈值参考["阈值参考"]
        W1["有效窗口 = 模型上下文 - 20K"]
        W2["压缩阈值 = 有效窗口 - 13K"]
        W3["警告阈值 = 有效窗口 - 20K"]
        W4["阻塞阈值 = 有效窗口 - 3K"]
    end
```

---

## 6. 组织策略限制 (PolicyLimits)

**文件**: `src/services/policyLimits/`

```mermaid
flowchart TD
    INIT["启动时"] --> ELIGIBLE{"资格判定"}

    ELIGIBLE -->|"Console API key"| YES["✓ 全部符合"]
    ELIGIBLE -->|"OAuth Team/Enterprise"| YES
    ELIGIBLE -->|"OAuth Free/Pro"| NO["✗ 不适用"]
    ELIGIBLE -->|"3P Provider"| NO

    YES --> FETCH["后台 fetch (30s timeout)"]
    FETCH --> CACHE["文件缓存<br/>~/.claude/policy-limits.json"]
    CACHE --> POLL["每小时轮询 (ETag)"]

    POLL --> ETAG{"304 Not Modified?"}
    ETAG -->|是| REUSE["复用本地 cache"]
    ETAG -->|否| UPDATE["更新 cache"]

    subgraph 检查["运行时检查"]
        QUERY["isPolicyAllowed(policy)"]
        QUERY --> HAS_DATA{"有 cache 数据?"}
        HAS_DATA -->|是| CHECK_RULE["检查 restrictions"]
        HAS_DATA -->|否| FAIL_OPEN["fail open (允许)"]

        CHECK_RULE -->|"policy 在 deny 列表"| DENY["拒绝"]
        CHECK_RULE -->|"否"| ALLOW["允许"]
    end

    subgraph 特殊["Essential Traffic Mode"]
        MISS["无 cache + DENY_ON_MISS 策略"]
        MISS --> DENY_SAFE["fail closed (拒绝)"]
    end
```

---

## 7. Bash 沙箱 (Sandbox)

**文件**: `src/utils/sandbox/`

```mermaid
flowchart TD
    BASH["BashTool 调用"] --> SANDBOX{"沙箱启用?"}

    SANDBOX -->|否| DIRECT["直接执行"]
    SANDBOX -->|是| WRAP["SandboxManager 包装"]

    WRAP --> FS["文件系统限制"]
    WRAP --> NET["网络限制"]
    WRAP --> MANAGED["Managed Domains<br/>(Policy 控制)"]

    FS --> ALLOW_W["allowWrite 路径"]
    FS --> DENY_W["denyWrite 路径"]

    subgraph 路径解析["路径解析规则"]
        P1["//path → /path (绝对)"]
        P2["/path → $SETTINGS_DIR/path"]
        P3["~/path → 展开 home"]
        P4["./path → 相对路径"]
    end
```

---

## 8. 文件状态缓存 (FileStateCache)

**文件**: `src/utils/fileStateCache.ts`

```mermaid
graph TD
    CACHE["FileStateCache"]

    CACHE --> LRU["LRU 容量: 100 条目"]
    CACHE --> BYTES["字节限制: 25MB"]
    CACHE --> NORMALIZE["路径规范化<br/>Windows / vs \\"]

    subgraph 状态["FileState"]
        CONTENT["content: string"]
        TS["timestamp: number"]
        OFFSET["offset?: number"]
        LIMIT["limit?: number"]
        PARTIAL["isPartialView?: boolean"]
    end

    subgraph 使用者["使用者"]
        FR["FileReadTool → 缓存读取结果"]
        FE["FileEditTool → 更新缓存"]
        FW["FileWriteTool → 更新缓存"]
        QE["QueryEngine → 跨调用共享"]
    end

    FR & FE & FW --> CACHE
    CACHE --> QE

    subgraph 部分视图["部分视图检测"]
        CLAUDE_MD["CLAUDE.md 注入时<br/>去除 HTML 注释"]
        PARTIAL_FLAG["isPartialView = true"]
        CLAUDE_MD --> PARTIAL_FLAG
    end
```

---

## 9. 对话恢复 (Conversation Recovery)

**文件**: `src/utils/conversationRecovery.ts`

```mermaid
flowchart TD
    RESUME["/resume 或 claude --resume"]

    RESUME --> READ_LOG["读取 session transcript"]
    READ_LOG --> DESERIALIZE["反序列化消息"]
    DESERIALIZE --> MIGRATE["迁移旧 attachment 类型"]

    MIGRATE --> FILTER["过滤清理"]
    FILTER --> F1["移除 orphaned thinking blocks"]
    FILTER --> F2["移除 unresolved tool_uses"]
    FILTER --> F3["移除 whitespace-only 助手消息"]

    FILTER --> DETECT{"最后一轮状态?"}
    DETECT -->|"有未完成 tool_use"| INTERRUPTED["kind: interrupted_prompt"]
    DETECT -->|"正常结束"| NORMAL["kind: normal"]

    INTERRUPTED --> RESTORE["恢复 FileStateCache<br/>从 compaction log 回放"]
    NORMAL --> RESTORE
    RESTORE --> READY["会话就绪"]
```

---

## 10. 模型选择 (Model Selection)

**文件**: `src/utils/model/`

```mermaid
flowchart TD
    subgraph 优先级链["模型选择优先级 (高→低)"]
        P1["1. /model 命令 (主循环 override)"]
        P2["2. --model 启动标志"]
        P3["3. ANTHROPIC_MODEL 环境变量"]
        P4["4. settings.json 配置"]
        P5["5. 内置默认值"]
    end

    P5 --> DEFAULT{"订阅类型?"}
    DEFAULT -->|"Max 用户"| OPUS["Opus 4.6 (+1M)"]
    DEFAULT -->|"Team Premium"| OPUS_STD["Opus 4.6"]
    DEFAULT -->|"Pro/Enterprise/其他"| SONNET["Sonnet 4.6"]

    subgraph 验证["模型验证"]
        CANONICAL["getCanonicalName()"]
        ALLOWED["isModelAllowed() (allowlist)"]
        DEPRECATED["弃用检查 + 迁移"]
    end

    subgraph 3P["第三方提供商"]
        BEDROCK["Bedrock"]
        VERTEX["Vertex"]
        FOUNDRY["Foundry"]
        NOTE["可能落后 first-party<br/>分别维护默认值"]
    end
```

---

## 11. 用户输入处理管道

**文件**: `src/utils/processUserInput/`

```mermaid
flowchart TD
    INPUT["用户原始输入"] --> DETECT{"输入类型?"}

    DETECT -->|"/ 前缀"| SLASH["斜杠命令解析"]
    DETECT -->|"! 前缀"| SHELL["Shell 直接执行"]
    DETECT -->|"文本"| TEXT["文本处理"]
    DETECT -->|"图片粘贴"| IMG["base64 编码<br/>可选 resize + downsample"]
    DETECT -->|"文件路径"| ATT["附件处理"]

    SLASH --> FIND["findCommand()"]
    FIND --> EXEC["命令执行"]

    TEXT --> BUILD["构建 UserMessage"]
    IMG --> BUILD
    ATT --> BUILD

    BUILD --> META{"特殊标记?"}
    META -->|"skipSlashCommands"| BRIDGE["Bridge/CCR 来源"]
    META -->|"isMeta"| SYSTEM["系统生成提示<br/>对用户隐藏"]
    META -->|"普通"| NORMAL["正常消息"]

    BUILD --> SUBMIT["提交给 QueryEngine"]
```

---

## 12. 会话内存 (Session Memory)

**文件**: `src/services/SessionMemory/`

```mermaid
flowchart TD
    TRIGGER["轮次结束"] --> INIT_CHECK{"tokens ≥ 40K?<br/>(初始化阈值)"}
    INIT_CHECK -->|否| WAIT["等待"]
    INIT_CHECK -->|是| UPDATE_CHECK{"距上次 ≥ 10K tokens<br/>+ tool_calls ≥ 3?"}

    UPDATE_CHECK -->|否| WAIT
    UPDATE_CHECK -->|是| TOOL_CHECK{"最后一轮有<br/>tool calls?"}

    TOOL_CHECK -->|是| DEFER["延迟到下轮"]
    TOOL_CHECK -->|否| EXTRACT["Forked Agent 提取"]

    EXTRACT --> TEMPLATE["读取模板"]
    TEMPLATE --> UPDATE["更新 session-memory/<session-id>.md"]

    UPDATE --> PARTS["9 个部分"]
    PARTS --> P1["Session Title"]
    PARTS --> P2["Current State"]
    PARTS --> P3["Task Specification"]
    PARTS --> P4["Files and Functions"]
    PARTS --> P5["Architecture"]
    PARTS --> P6["Key Decisions"]
    PARTS --> P7["Known Issues"]
    PARTS --> P8["Next Steps"]
    PARTS --> P9["Custom Notes"]

    subgraph 限制["限制"]
        MAX_SECTION["单部分: ≤ 2000 tokens"]
        MAX_TOTAL["总计: ≤ 12000 tokens"]
    end
```

---

## 13. OAuth 认证流程

**文件**: `src/services/oauth/`

```mermaid
sequenceDiagram
    participant CLI as Claude Code
    participant Browser as 浏览器
    participant Auth as 认证服务
    participant Store as 安全存储

    CLI->>CLI: 生成 PKCE (Verifier + Challenge)
    CLI->>CLI: 启动本地监听器 (随机端口)

    alt Console OAuth
        CLI->>Browser: 打开授权 URL<br/>scope: org:create_api_key + user:profile
    else Claude.ai OAuth
        CLI->>Browser: 打开授权 URL<br/>scope: user:inference + user:profile +<br/>user:sessions:claude_code + user:mcp_servers
    end

    Browser->>Auth: 用户授权
    Auth-->>CLI: 重定向 + 授权码

    CLI->>Auth: Token 交换 (code + verifier)
    Auth-->>CLI: Access Token + Refresh Token
    CLI->>Store: 安全存储 token

    Note over CLI: 自动 refresh
    CLI->>Auth: checkAndRefreshOAuthTokenIfNeeded()
```

---

## 14. 工作树隔离 (Worktree)

**文件**: `src/utils/worktree.ts`

```mermaid
stateDiagram-v2
    [*] --> 验证Slug
    验证Slug --> 创建目录 : 64字符, [a-zA-Z0-9._/-]

    state 创建目录 {
        [*] --> mkdir
        mkdir --> 符号链接大目录
        符号链接大目录 --> 复制项目配置
    }

    创建目录 --> Git操作
    
    state Git操作 {
        [*] --> 创建Worktree分支
        创建Worktree分支 --> 记录原始Branch
    }

    Git操作 --> Hook执行 : worktree-create hook
    Hook执行 --> 切换CWD
    切换CWD --> 工作中

    工作中 --> ExitWorktree : 用户请求退出
    
    state ExitWorktree {
        [*] --> 检查变更
        检查变更 --> keep : 保留目录和分支
        检查变更 --> remove : 删除 (需确认 discard_changes)
    }

    ExitWorktree --> 恢复原始CWD
    恢复原始CWD --> [*]
```

---

## 15. 输出风格定制 (Output Styles)

**文件**: `src/outputStyles/`

```mermaid
flowchart TD
    subgraph 来源["风格来源 (优先级低→高)"]
        BUILTIN["Built-in<br/>default / Explanatory / Learning"]
        PLUGIN["Plugin styles<br/>(forceForPlugin 标记)"]
        USER_S["~/.claude/outputStyles/*.md"]
        PROJECT_S[".claude/outputStyles/*.md"]
        MANAGED["Policy/Managed styles"]
    end

    BUILTIN --> MERGE["合并"]
    PLUGIN --> MERGE
    USER_S --> MERGE
    PROJECT_S --> MERGE
    MANAGED --> MERGE

    MERGE --> CONFIG["OutputStyleConfig"]
    CONFIG --> INJECT["注入系统提示词<br/># Output Style: {name}<br/>{prompt}"]
    INJECT --> MODEL["影响模型输出<br/>格式和深度"]
```

---

## 设计原则总结

```mermaid
graph LR
    subgraph 原则["核心设计原则"]
        FO["Fail-Open<br/>策略查询失败时允许"]
        BG["后台化<br/>不阻塞用户交互"]
        CACHE["缓存友好<br/>减少重复计算和 API 调用"]
        ISOLATE["隔离执行<br/>Overlay/Worktree/Sandbox"]
        THROTTLE["节流机制<br/>防止重复触发"]
        MUTEX["互斥锁<br/>防止并发冲突"]
    end
```

| 场景 | 使用原则 |
|------|---------|
| PolicyLimits | Fail-Open + 缓存 + 定期轮询 |
| AutoDream | 后台化 + 节流 + 互斥锁 |
| Speculation | 隔离执行 (Overlay) + 缓存共享 |
| ExtractMemories | 后台化 + 互斥 + 游标推进 |
| AutoCompact | 节流 + 断路器 (3 次失败) |
| MagicDocs | 后台化 + idle 检测 |
| FileStateCache | LRU + 字节限制 + 路径规范化 |
