# 13 - 隐藏功能与未公开特性

## 隐藏功能总览

```mermaid
mindmap
  root((隐藏功能))
    🐾 趣味功能
      Buddy 宠物系统
      Thinkback 年度回顾
      Stickers 贴纸
    🔮 AI 高级能力
      推测执行 Speculation
      自动梦想 AutoDream
      魔法文档 MagicDocs
      记忆提取 ExtractMemories
      Advisor 顾问模型
      Prompt Suggestion
    🕵️ 安全/调试
      Undercover 卧底模式
      VCR 录制回放
      IS_DEMO 演示模式
      Bridge-Kick 故障注入
      HeapDump 堆转储
    🧪 实验性功能
      Fork Subagent 分叉代理
      Ultraplan 超级规划
      Bagel Web 浏览器
      Tungsten Tmux 终端
      Speculation 推测执行
    🏢 企业/内部
      Grove 隐私政策
      Policy Limits 策略限制
      Kairos 助手模式
      MoreRight 侧面板
      Insights 分析报告
```

---

## 1. 推测执行 (Speculation) — 最隐蔽的功能

```mermaid
sequenceDiagram
    participant User as 用户 (打字中)
    participant REPL as REPL
    participant Spec as Speculation 引擎
    participant Overlay as 临时文件系统
    participant API as Claude API

    User->>REPL: 开始输入...
    
    Note over Spec: 预测用户意图
    Spec->>Overlay: 创建 Copy-on-Write 隔离层
    Spec->>API: 提前发送推测请求
    
    API-->>Spec: 推测结果 (只读操作)
    Spec->>Overlay: 在 overlay 中执行代码
    
    User->>REPL: 确认执行
    
    alt 推测正确
        Spec->>REPL: 直接应用结果 ⚡
        Note over REPL: 用户感知零延迟
    else 推测错误
        Spec->>Overlay: 丢弃 overlay
        REPL->>API: 正常执行
    end
```

```mermaid
graph TD
    SPEC["推测执行系统"]
    
    SPEC --> ALLOWED["允许的推测工具"]
    ALLOWED --> READ_ONLY["只读: Read, Glob, Grep, LSP"]
    ALLOWED --> WRITE_SAFE["安全写: FileEdit (在 overlay 中)"]
    
    SPEC --> BLOCKED["禁止的工具"]
    BLOCKED --> BASH_B["Bash (非只读)"]
    BLOCKED --> NET_B["网络请求"]
    BLOCKED --> OTHER_B["大多数其他工具"]
    
    SPEC --> LIMITS["限制"]
    LIMITS --> L1["最多 20 轮"]
    LIMITS --> L2["最多 100 条消息"]
    LIMITS --> L3["仅 ant 内部用户"]
    
    SPEC --> METRICS["时间节省追踪"]
    
    style SPEC fill:#f9f,stroke:#333
    style BLOCKED fill:#fdd
```

---

## 2. Buddy 宠物系统

```mermaid
graph TD
    BUDDY["Buddy 伴侣系统<br/>feature('BUDDY')"]
    
    BUDDY --> SEED["用户标识符 → Mulberry32 PRNG"]
    
    SEED --> SPECIES["16 种物种"]
    SPECIES --> S1["🦆 鸭子"]
    SPECIES --> S2["🪿 鹅"]
    SPECIES --> S3["🫧 Blob"]
    SPECIES --> S4["🐱 猫"]
    SPECIES --> S5["🐉 龙"]
    SPECIES --> S6["🐙 章鱼"]
    SPECIES --> S7["🦉 猫头鹰"]
    SPECIES --> S8["🐧 企鹅"]
    SPECIES --> S9["🐢 乌龟"]
    SPECIES --> S10["🐌 蜗牛"]
    SPECIES --> S11["👻 幽灵"]
    SPECIES --> S12["🦎 美西螈"]
    SPECIES --> S13["🐹 水豚"]
    SPECIES --> S14["🌵 仙人掌"]
    SPECIES --> S15["🤖 机器人"]
    SPECIES --> S16["🐰 兔子"]
    
    SEED --> RARITY["5 个稀有度"]
    RARITY --> R1["Common 普通"]
    RARITY --> R2["Uncommon 非凡"]
    RARITY --> R3["Rare 稀有"]
    RARITY --> R4["Epic 史诗"]
    RARITY --> R5["Legendary 传说"]
    
    SEED --> DECOR["装饰属性"]
    DECOR --> EYES["眼睛样式"]
    DECOR --> HATS["帽子样式"]
    DECOR --> TRAITS["性格特征"]
    
    BUDDY --> RENDER["CompanionSprite.tsx<br/>终端精灵渲染"]
    BUDDY --> NOTIFY["useBuddyNotification<br/>伴侣通知"]

    style BUDDY fill:#fef,stroke:#f0f
```

---

## 3. 自动梦想 (AutoDream) — 后台记忆巩固

```mermaid
flowchart TD
    TRIGGER["会话结束"]
    
    TRIGGER --> GATE{"门控检查"}
    GATE -->|"GrowthBook: tengu_onyx_plover"| TIME{"距上次 > 24h?"}
    TIME -->|"是"| SESSION{"会话数 >= 5?"}
    SESSION -->|"是"| DREAM["启动 Dream 任务"]
    
    TIME -->|"否"| SKIP["跳过"]
    SESSION -->|"否"| SKIP
    
    DREAM --> FORK["Fork 子代理"]
    FORK --> CONSOLIDATE["运行 /dream 提示<br/>consolidationPrompt.ts"]
    CONSOLIDATE --> MEMORIES["整合学到的知识"]
    MEMORIES --> WRITE["写入 memory/ 目录"]
    
    WRITE --> LOCK["consolidationLock.ts<br/>防并发锁"]

    style DREAM fill:#ddf,stroke:#33f
```

---

## 4. 魔法文档 (Magic Docs)

```mermaid
flowchart TD
    DETECT["检测文件头部:<br/># MAGIC DOC: [title]"]
    
    DETECT --> FORK["Fork 后台子代理"]
    FORK --> ANALYZE["分析新学到的知识"]
    ANALYZE --> UPDATE["自动更新文档内容"]
    UPDATE --> SAVE["保存更新后的文件"]
    
    NOTE["特点:<br/>- 自动维护标记文档<br/>- 后台运行不阻塞用户<br/>- 集成新学习和洞察"]

    style DETECT fill:#ffd,stroke:#aa0
```

---

## 5. 卧底模式 (Undercover)

```mermaid
flowchart TD
    CHECK["检查仓库"]
    
    CHECK --> ENV{"CLAUDE_CODE_UNDERCOVER=1?"}
    ENV -->|"是"| ENABLE["强制启用"]
    ENV -->|"否"| REPO{"仓库在内部允许列表中?"}
    REPO -->|"是"| DISABLE["禁用 (安全)"]
    REPO -->|"否"| ENABLE
    
    ENABLE --> ACTIONS["卧底行为"]
    ACTIONS --> A1["从提交消息移除 Anthropic 信息"]
    ACTIONS --> A2["从 PR 移除内部属性"]
    ACTIONS --> A3["不告诉模型它是什么模型"]
    ACTIONS --> A4["禁止包含 'Claude Code' 等关键词"]
    ACTIONS --> A5["移除所有模型代号引用"]

    style ENABLE fill:#fdd,stroke:#f00
```

---

## 6. VCR 录制/回放

```mermaid
stateDiagram-v2
    [*] --> 检查模式
    
    检查模式 --> 录制模式 : VCR_RECORD=1
    检查模式 --> 回放模式 : NODE_ENV=test
    检查模式 --> 正常模式 : 默认
    
    录制模式 --> 捕获请求 : API 调用
    捕获请求 --> 脱敏处理 : 路径规范化 + 敏感数据移除
    脱敏处理 --> 写入Fixture : 保存到文件
    写入Fixture --> 录制模式
    
    回放模式 --> 匹配请求 : API 调用
    匹配请求 --> 返回Fixture : 匹配成功
    匹配请求 --> 抛出错误 : 无匹配
    返回Fixture --> 回放模式
```

---

## 7. Grove 隐私政策框架

```mermaid
sequenceDiagram
    participant CLI as Claude Code
    participant Cache as 本地缓存
    participant API as Grove API
    participant User as 用户

    CLI->>Cache: 检查本地缓存
    
    alt 缓存有效 (< 1 小时)
        Cache-->>CLI: 返回缓存策略
    else 缓存过期
        CLI->>API: GET /api/claude_code_grove
        API-->>CLI: 政策数据 + ETag
        CLI->>Cache: 更新缓存
    end
    
    alt 需要用户同意
        CLI->>User: 显示 Grove 对话框
        User-->>CLI: 接受/拒绝
        CLI->>API: POST 用户选择
    else 宽限期
        CLI->>User: 显示非阻塞通知
    end
    
    Note over CLI: 故障开放:<br/>网络故障时继续运行
```

---

## 8. IS_DEMO 演示模式

```mermaid
graph TD
    DEMO["IS_DEMO=1"]
    
    DEMO --> HIDE["隐藏信息"]
    HIDE --> H1["隐藏组织名称"]
    HIDE --> H2["隐藏电子邮件"]
    HIDE --> H3["隐藏账户信息"]
    
    DEMO --> SKIP["跳过流程"]
    SKIP --> S1["跳过项目入职"]
    SKIP --> S2["禁用内部命令"]
    
    DEMO --> PURPOSE["用途"]
    PURPOSE --> P1["公开演示"]
    PURPOSE --> P2["截图/录屏"]
    PURPOSE --> P3["展示会议"]

    style DEMO fill:#ffd,stroke:#aa0
```

---

## 9. 防休眠服务

```mermaid
flowchart TD
    TASK["长时间运行任务"]
    
    TASK --> ACQUIRE["获取防休眠锁"]
    ACQUIRE --> CHECK{"macOS?"}
    
    CHECK -->|"是"| CAFFEINATE["执行 caffeinate 命令"]
    CHECK -->|"否"| NOOP["空操作"]
    
    CAFFEINATE --> REFCOUNT["引用计数 + 1"]
    
    TASK --> COMPLETE["任务完成"]
    COMPLETE --> RELEASE["释放防休眠锁"]
    RELEASE --> DEC["引用计数 - 1"]
    DEC --> ZERO{"引用 = 0?"}
    ZERO -->|"是"| STOP["停止 caffeinate"]
    ZERO -->|"否"| KEEP["保持运行"]
    
    CAFFEINATE --> TIMEOUT["5 分钟超时<br/>4 分钟重启间隔"]
```

---

## 10. 离开摘要生成

```mermaid
flowchart LR
    AWAY["用户离开一段时间"] --> RETURN["用户返回"]
    RETURN --> GENERATE["生成 1-3 句摘要"]
    GENERATE --> FAST_MODEL["使用小型快速模型"]
    FAST_MODEL --> DISPLAY["显示摘要:<br/>'在你离开时...'"]
```

---

## 11. 完整特性标志地图

```mermaid
graph TD
    subgraph 用户可见["用户可见特性"]
        F_VOICE["VOICE_MODE<br/>语音输入"]
        F_BUDDY["BUDDY<br/>宠物系统"]
        F_THINK["thinkback<br/>年度回顾"]
        F_WORKFLOW["WORKFLOW_SCRIPTS<br/>工作流"]
        F_TRIGGER["AGENT_TRIGGERS<br/>Cron 定时"]
    end

    subgraph 实验性["实验性特性"]
        F_SPEC["Speculation<br/>推测执行"]
        F_FORK["FORK_SUBAGENT<br/>分叉代理"]
        F_ULTRA["ULTRAPLAN<br/>超级规划"]
        F_WEB["WEB_BROWSER_TOOL<br/>浏览器工具 (Bagel)"]
        F_SNIP["HISTORY_SNIP<br/>历史片段化"]
        F_CTX["CONTEXT_COLLAPSE<br/>上下文折叠"]
        F_TERMINAL["TERMINAL_PANEL<br/>终端面板"]
    end

    subgraph 内部功能["Ant 内部功能"]
        F_KAIROS["KAIROS<br/>助手模式"]
        F_BRIDGE["BRIDGE_MODE<br/>远程控制"]
        F_DAEMON["DAEMON<br/>守护进程"]
        F_COORD["COORDINATOR_MODE<br/>多代理协调"]
        F_PROACT["PROACTIVE<br/>主动模式"]
        F_MONITOR["MONITOR_TOOL<br/>监控工具"]
    end

    subgraph 基础设施["基础设施特性"]
        F_EXTRACT["EXTRACT_MEMORIES<br/>记忆提取"]
        F_REACTIVE["REACTIVE_COMPACT<br/>响应式压缩"]
        F_CACHED["CACHED_MICROCOMPACT<br/>缓存压缩"]
        F_TOKEN["TOKEN_BUDGET<br/>Token 预算"]
        F_VERIFY["VERIFICATION_AGENT<br/>验证代理"]
        F_BG["BG_SESSIONS<br/>后台会话"]
        F_DIRECT["DIRECT_CONNECT<br/>直连"]
        F_SSH["SSH_REMOTE<br/>SSH 远程"]
    end

    style 实验性 fill:#ffd
    style 内部功能 fill:#fdd
    style 基础设施 fill:#ddf
```

---

## 12. 隐藏斜杠命令

```mermaid
graph TD
    subgraph 隐藏命令["isHidden: true 的命令"]
        H1["/heapdump<br/>堆转储到桌面"]
        H2["/good-claude<br/>反馈 (已禁用)"]
        H3["/bughunter<br/>Bug 搜索 (已禁用)"]
        H4["/perf-issue<br/>性能问题 (已禁用)"]
        H5["/ant-trace<br/>跟踪 (已禁用)"]
        H6["/bridge-kick<br/>Bridge 故障注入"]
        H7["/mock-limits<br/>模拟限制"]
        H8["/debug-tool-call<br/>调试工具调用"]
        H9["/break-cache<br/>缓存断开"]
        H10["/backfill-sessions<br/>会话回填"]
    end
    
    subgraph 条件命令["条件可见命令"]
        C1["/thinkback<br/>年度回顾 (GrowthBook)"]
        C2["/advisor<br/>顾问模型 (GrowthBook)"]
        C3["/fork<br/>分叉代理 (FORK_SUBAGENT)"]
        C4["/voice<br/>语音模式 (VOICE_MODE)"]
        C5["/workflows<br/>工作流 (WORKFLOW_SCRIPTS)"]
        C6["/buddy<br/>伴侣 (BUDDY)"]
        C7["/ultraplan<br/>超级规划 (ULTRAPLAN)"]
        C8["/torch<br/>未知 (TORCH)"]
        C9["/peers<br/>同伴列表 (UDS_INBOX)"]
        C10["/brief<br/>简报 (KAIROS)"]
    end
    
    style 隐藏命令 fill:#fee
    style 条件命令 fill:#ffe
```

---

## 13. 关键隐藏环境变量

```mermaid
graph LR
    subgraph 调试["调试变量"]
        E1["FORCE_VCR=1<br/>强制录制回放"]
        E2["VCR_RECORD=1<br/>VCR 录制模式"]
        E3["ENABLE_LSP_TOOL<br/>启用 LSP 工具"]
        E4["CLAUDE_CODE_VERIFY_PLAN<br/>计划验证"]
    end

    subgraph 模式["模式控制"]
        E5["CLAUDE_CODE_UNDERCOVER=1<br/>卧底模式"]
        E6["CLAUDE_CODE_SIMPLE<br/>极简工具集"]
        E7["CLAUDE_CODE_COORDINATOR_MODE<br/>协调器"]
        E8["CLAUDE_CODE_REMOTE<br/>远程模式"]
        E9["IS_DEMO<br/>演示模式"]
    end

    subgraph 功能["功能开关"]
        E10["CLAUDE_CODE_DISABLE_AUTO_MEMORY<br/>禁用自动记忆"]
        E11["CLAUDE_CODE_SKIP_PROMPT_HISTORY<br/>跳过提示历史"]
        E12["DISABLE_COMPACT<br/>禁用压缩"]
        E13["CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION<br/>提示建议"]
    end

    style 调试 fill:#ddf
    style 模式 fill:#ffd
    style 功能 fill:#dfd
```

---

## 14. 任务系统 — 后台任务类型

```mermaid
graph TD
    TASKS["任务系统 (src/tasks/)"]
    
    TASKS --> DREAM_TASK["DreamTask<br/>自动梦想整合"]
    TASKS --> TEAMMATE["InProcessTeammateTask<br/>进程内队友"]
    TASKS --> REMOTE_AGENT["RemoteAgentTask<br/>远程代理任务"]
    TASKS --> LOCAL_SHELL["LocalShellTask<br/>本地 Shell 任务"]
    TASKS --> CRON_TASK["Cron 定时任务<br/>(AGENT_TRIGGERS)"]
    
    DREAM_TASK --> AUTO["自动触发<br/>24h + 5 sessions"]
    TEAMMATE --> COORD["协调器模式"]
    REMOTE_AGENT --> BRIDGE_T["Bridge 远程"]
    LOCAL_SHELL --> BASH_T["Bash 后台"]
    CRON_TASK --> SCHEDULE["定时调度"]

    style TASKS fill:#f9f
```

---

## 总结：最值得关注的隐藏功能

| 功能 | 隐蔽程度 | 类型 | 备注 |
|------|----------|------|------|
| **推测执行** | ★★★★★ | AI | 预测用户意图，提前执行 |
| **自动梦想** | ★★★★☆ | AI | 后台自动整合记忆 |
| **魔法文档** | ★★★★☆ | AI | 自动维护标记文档 |
| **卧底模式** | ★★★★☆ | 安全 | 公开仓库信息隐藏 |
| **Buddy 宠物** | ★★★☆☆ | 趣味 | 16 种物种 + 5 稀有度 |
| **VCR 录制** | ★★★☆☆ | 调试 | API 请求录制回放 |
| **Grove 隐私** | ★★★☆☆ | 企业 | 隐私政策框架 |
| **Bagel 浏览器** | ★★★☆☆ | 实验 | 内嵌 Web 浏览器 |
| **Tungsten 终端** | ★★★☆☆ | 内部 | 虚拟 Tmux |
| **演示模式** | ★★☆☆☆ | 工具 | 公开演示信息隐藏 |
| **防休眠** | ★★☆☆☆ | 系统 | macOS caffeinate |
| **离开摘要** | ★★☆☆☆ | UX | 离开后回来时的摘要 |
