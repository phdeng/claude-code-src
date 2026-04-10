# 21 - 高级应用场景（第三批）

> 从源码深层挖掘的高级场景：API 子系统、渲染引擎、IDE 集成、语音、Swarm 协调等。

---

## 1. 会话持久化与远程同步 (Session Ingress)

**文件**: `src/services/api/sessionIngress.ts`

```mermaid
flowchart TD
    LOG["日志追加请求"] --> OCC["乐观并发控制<br/>Last-Uuid 头部"]

    OCC --> SEND["发送请求"]
    SEND --> RESP{"响应?"}

    RESP -->|"200 OK"| SUCCESS["追加成功<br/>更新 UUID"]
    RESP -->|"409 冲突"| CONFLICT["UUID 不匹配"]
    CONFLICT --> RETRY["采纳服务器 UUID<br/>最多重试 10 次<br/>指数退避 500ms→8s"]
    RETRY --> SEND

    subgraph 顺序化["每会话顺序化"]
        SEQ["sequential wrapper<br/>per sessionId"]
        SEQ --> QUEUE["请求排队<br/>防止争用"]
    end

    subgraph 电传["电传迁移 (Teleport)"]
        TELEPORT["getTeleportEvents()"]
        TELEPORT --> PAGES["分页获取<br/>每页 1000 条<br/>最多 100 页"]
        PAGES --> P404{"中间 404?"}
        P404 -->|是| PARTIAL["返回部分数据"]
        P404 -->|否| FULL["返回完整数据"]
    end
```

---

## 2. 推荐码与访客通行证

**文件**: `src/services/api/referral.ts`

```mermaid
flowchart TD
    CHECK["Max 订阅者启动"] --> PREFETCH["prefetchPassesEligibility()<br/>后台预取"]
    PREFETCH --> CACHE["24h 缓存<br/>后台刷新"]

    INVITE["用户邀请朋友"] --> ELIGIBLE{"资格?"}
    ELIGIBLE -->|"Max 订阅 + OAuth orgId"| GENERATE["生成推荐码"]
    ELIGIBLE -->|否| DENY["不可用"]

    subgraph 奖励["多币种奖励格式"]
        USD["USD $"]
        EUR["EUR €"]
        GBP["GBP £"]
        BRL["BRL R$"]
        CAD["CAD CA$"]
        MINOR["金额: minor_units / 100"]
    end
```

---

## 3. 超额使用额度 (Overage Credit)

**文件**: `src/services/api/overageCreditGrant.ts`

```mermaid
flowchart LR
    APPROACH["接近限制"] --> CHECK["检查额度资格"]
    CHECK --> CACHE["1h TTL 缓存"]
    CACHE --> GRANT{"有额度?"}
    GRANT -->|"非零"| SHOW["显示额度 UI"]
    GRANT -->|"零/null"| HIDE["不渲染"]

    subgraph 优化["写入优化"]
        COMPARE["数据未变时<br/>跳过磁盘写入"]
    end
```

---

## 4. 指标选择退出 (Metrics Opt-Out)

**文件**: `src/services/api/metricsOptOut.ts`

```mermaid
flowchart TD
    CHECK_METRICS["checkMetricsEnabled()"]

    CHECK_METRICS --> MEM_CACHE{"内存缓存<br/>TTL 1h?"}
    MEM_CACHE -->|"有效"| RETURN["返回缓存值"]
    MEM_CACHE -->|"过期"| DISK_CACHE{"磁盘缓存<br/>TTL 24h?"}

    DISK_CACHE -->|"新鲜"| LOAD["加载磁盘值<br/>零网络开销"]
    DISK_CACHE -->|"过期"| FETCH["后台 API 调用<br/>返回旧值 (非阻塞)"]

    FETCH --> SAVE["更新双层缓存"]

    subgraph 回退["服务密钥回退"]
        SK["无 user:profile 作用域"]
        SK --> API_KEY["回退到 API 密钥认证"]
        API_KEY --> NO_CACHE["不缓存推导结果<br/>(防跨会话毒化)"]
    end
```

---

## 5. 文件上传 API

**文件**: `src/services/api/filesApi.ts`

```mermaid
flowchart TD
    UPLOAD["文件上传"] --> VALIDATE["大小验证<br/>≤ 500MB"]
    VALIDATE --> CONCURRENT["并发限制: 5<br/>工作队列模式"]
    CONCURRENT --> RETRY["重试: 3 次<br/>指数退避 500ms→2s"]
    RETRY --> TIMEOUT["上传超时: 120s<br/>下载超时: 60s"]

    subgraph 隔离["会话隔离"]
        PATH["{basePath}/{sessionId}/uploads/{file}"]
        TRAVERSAL["路径遍历验证<br/>拒绝 .."]
        DEDUP["冗余前缀剥离<br/>避免 /uploads/uploads/"]
    end

    subgraph 列表["文件列表"]
        LIST["listFilesCreatedAfter()"]
        LIST --> FILTER["时间戳过滤<br/>after_created_at (ISO 8601)"]
        FILTER --> CURSOR["自动分页<br/>after_id 游标"]
    end
```

---

## 6. 思考/推理模式 (Thinking)

**文件**: `src/utils/thinking.ts`

```mermaid
flowchart TD
    MODEL["当前模型"] --> SUPPORT{"思考支持?"}

    SUPPORT -->|"1P/Foundry"| ALL_4["所有 Claude 4+<br/>(含 Haiku 4.5)"]
    SUPPORT -->|"3P (Bedrock/Vertex)"| ONLY_OPUS_SONNET["仅 Opus 4+ / Sonnet 4+"]

    MODEL --> ADAPTIVE{"自适应思考?"}
    ADAPTIVE -->|"仅 Claude 4.6<br/>Opus/Sonnet"| YES_ADAPT["支持"]
    ADAPTIVE -->|"旧模型"| NO_ADAPT["不支持"]

    subgraph 环境覆盖["环境变量覆盖"]
        ENV["MAX_THINKING_TOKENS"]
        ENV -->|"> 0"| FORCE_ON["强制启用"]
        ENV -->|"= 0"| FORCE_OFF["强制禁用"]
    end

    subgraph Ultrathink["Ultrathink 关键字"]
        KEYWORD["用户输入 'ultrathink'"]
        KEYWORD --> RAINBOW["彩虹高亮 (7 色循环)<br/>可选闪烁效果"]
        KEYWORD --> ALL_POS["返回所有匹配位置"]
    end
```

---

## 7. 终端 Ink 渲染引擎

**文件**: `src/ink/output.ts`, `src/ink/dom.ts`, `src/ink/reconciler.ts`

```mermaid
graph TD
    subgraph 渲染管线["渲染管线"]
        REACT["React 组件树"] --> RECONCILER["Reconciler<br/>(React-Ink 桥接)"]
        RECONCILER --> YOGA["Yoga 布局引擎<br/>(flexbox 计算)"]
        YOGA --> DOM["DOM → 字符网格"]
        DOM --> OUTPUT["Output 渲染器"]
        OUTPUT --> SCREEN["Screen 双缓冲"]
        SCREEN --> TERMINAL["终端输出"]
    end

    subgraph 缓存["缓存层"]
        CHAR_CACHE["charCache<br/>最多 16384 行<br/>避免重复 tokenize"]
        TOKEN_CACHE["Markdown TOKEN_CACHE<br/>最多 500 条<br/>MRU 驱逐"]
        YOGA_COUNTER["Yoga 计数器<br/>访问/测量/缓存命中"]
    end

    subgraph 优化["渲染优化"]
        BLIT["增量 blitting<br/>TypedArray.set() 批量复制"]
        SOFT_WRAP["软换行位图<br/>区分源文本 vs word-wrap"]
        FAST_PATH["Markdown 快速路径<br/>前 500 字符采样<br/>无语法 → 跳过 lexer"]
    end

    subgraph 诊断["诊断模式"]
        COMMIT_LOG["CLAUDE_CODE_COMMIT_LOG<br/>渲染时序日志"]
        COMMIT_LOG --> TIMING["提交时间差<br/>和解化时间<br/>layout + paint 分解"]
    end
```

---

## 8. 命令自动完成 (Typeahead)

**文件**: `src/hooks/useTypeahead.tsx`

```mermaid
flowchart TD
    INPUT["用户输入"] --> DETECT{"输入类型"}

    DETECT -->|"/ 前缀"| SLASH["斜杠命令补全"]
    DETECT -->|"@ 前缀"| MENTION["文件/成员提及"]
    DETECT -->|"# 前缀"| CHANNEL["Slack 频道"]
    DETECT -->|"普通文本"| UNIFIED["统一建议"]

    UNIFIED --> SOURCES["多源合并"]
    SOURCES --> S1["Shell 历史"]
    SOURCES --> S2["目录补全"]
    SOURCES --> S3["路径补全"]
    SOURCES --> S4["会话标题搜索"]
    SOURCES --> S5["代理恢复"]

    SOURCES --> SORT["合并排序"]
    SORT --> SELECT["选择保留<br/>跨查询维持索引"]

    subgraph Unicode["Unicode 感知"]
        REGEX["\\p{L}\\p{N}\\p{M}<br/>包含 CJK、音标、组合标记"]
    end

    subgraph 后台["后台优化"]
        BG_REFRESH["文件索引后台刷新<br/>startBackgroundCacheRefresh()"]
    end
```

---

## 9. IDE 集成与选择上下文

**文件**: `src/hooks/useIdeConnectionStatus.ts`, `src/hooks/useIdeSelection.ts`

```mermaid
sequenceDiagram
    participant IDE as IDE (VS Code/JetBrains)
    participant MCP as MCP 连接
    participant Hook as IDE Hooks
    participant UI as Claude Code UI

    IDE->>MCP: MCP 连接 (sse-ide/ws-ide)
    MCP->>Hook: 连接状态通知

    Hook->>Hook: 提取 IDE 名称<br/>(config.ideName)

    IDE->>MCP: 文本选择事件
    MCP->>Hook: useIdeSelection
    Hook->>Hook: Schema 验证<br/>行数计算<br/>(末尾 char=0 不计)

    Hook->>UI: ide_selection 标签<br/>注入到对话上下文
```

---

## 10. 语音模式

**文件**: `src/voice/voiceModeEnabled.ts`, `src/services/voice.ts`

```mermaid
flowchart TD
    VOICE_CHECK["语音模式检查"] --> COMPILE{"feature('VOICE_MODE')<br/>编译时?"}
    COMPILE -->|否| UNAVAILABLE["不可用"]
    COMPILE -->|是| GB{"GrowthBook<br/>tengu_amber_quartz_disabled?"}
    GB -->|"禁用"| UNAVAILABLE
    GB -->|"未禁用"| AUTH{"OAuth token?"}
    AUTH -->|否| UNAVAILABLE
    AUTH -->|是| AVAILABLE["语音可用"]

    AVAILABLE --> CAPTURE["音频捕获"]
    CAPTURE --> PLATFORM{"平台?"}
    PLATFORM -->|"macOS/Windows"| CPAL["audio-capture-napi<br/>(cpal 后端)"]
    PLATFORM -->|"Linux"| ARECORD["arecord 探针<br/>(ALSA 检测)"]
    PLATFORM -->|"WSL"| SOX["SoX 回退"]

    CAPTURE --> FORMAT["16kHz 单声道<br/>16-bit PCM"]
    FORMAT --> STT["语音转文字"]
    STT --> LANG["语言规范化<br/>不支持的语言回退"]
```

---

## 11. 模型弃用警告

**文件**: `src/utils/model/deprecation.ts`

```mermaid
graph TD
    MODEL["用户选择的模型"] --> MATCH["不区分大小写子串匹配"]

    MATCH --> DATES["按 Provider 的退休日期"]
    DATES --> P1["1P: 2026/01/05 (Claude 3 Opus)"]
    DATES --> P2["Bedrock: 2026/04/28 (Sonnet 3.7)"]
    DATES --> P3["Vertex: 不同日期"]
    DATES --> P4["Foundry: 不同日期"]

    DATES --> WARN["⚠ {model} will be retired on {date}..."]
```

---

## 12. Swarm 权限同步

**文件**: `src/utils/swarm/permissionSync.ts`

```mermaid
sequenceDiagram
    participant Worker as Worker 代理
    participant Mailbox as 文件邮箱
    participant Leader as Team Lead

    Worker->>Worker: 尝试使用受限工具
    Worker->>Mailbox: permission_request<br/>{tool_name, tool_input, description}

    Mailbox->>Leader: 读取请求
    Leader->>Leader: 审查工具调用

    alt 批准
        Leader->>Mailbox: permission_response<br/>{status: approved, modified_input?}
        Mailbox->>Worker: 继续执行
    else 拒绝
        Leader->>Mailbox: permission_response<br/>{status: rejected, feedback}
        Mailbox->>Worker: 工具被拒绝
    end
```

---

## 13. Team 允许路径 (共享编辑权限)

**文件**: `src/utils/swarm/teamHelpers.ts`

```mermaid
graph TD
    LEADER["Team Lead"] --> ADD["添加允许路径"]
    ADD --> PATHS["TeamAllowedPath[]"]

    PATHS --> ENTRY["每条记录:<br/>path, toolName,<br/>addedBy, addedAt"]

    subgraph 效果["效果"]
        MEMBER["任何成员"] --> TOOL_CALL["工具调用 (Edit/Write)"]
        TOOL_CALL --> CHECK{"路径在允许列表中?"}
        CHECK -->|是| SKIP_PERM["跳过权限提示"]
        CHECK -->|否| ASK_PERM["正常权限流"]
    end
```

---

## 14. 进程内 Teammate 隔离

**文件**: `src/utils/swarm/spawnInProcess.ts`

```mermaid
flowchart TD
    SPAWN["spawnInProcessTeammate()"] --> CTX["创建 TeammateContext<br/>(AsyncLocalStorage)"]

    CTX --> FIELDS["上下文字段:<br/>name, teamName, color,<br/>planModeRequired, agentId"]

    CTX --> ABORT["链接 AbortController<br/>到父代理"]
    CTX --> REGISTER["注册到 AppState.tasks"]
    CTX --> START["startInProcessTeammate()"]

    subgraph 隔离["隔离机制"]
        ALS["AsyncLocalStorage<br/>每个代理独立上下文"]
        CONCURRENT["同一进程 3+ 代理"]
        NO_TTY["无 TTY (in-process)"]
    end

    subgraph 权限["权限配置"]
        PLAN["planModeRequired<br/>强制计划批准"]
        PERMS["permissions[] 列表"]
        PROMPT["allowPermissionPrompts<br/>false = 自动拒绝"]
    end
```

---

## 15. Grove 隐私通知系统

**文件**: `src/services/api/grove.ts`

```mermaid
stateDiagram-v2
    [*] --> 检查资格

    state 检查资格 {
        [*] --> 缓存检查
        缓存检查 --> 新鲜 : TTL < 24h
        缓存检查 --> 后台刷新 : TTL ≥ 24h
        缓存检查 --> 冷启动 : 无缓存
    }

    检查资格 --> 需要通知 : 合格
    检查资格 --> 无操作 : 不合格/冷启动

    state 需要通知 {
        [*] --> 交互式?
        交互式? --> 显示对话 : 是
        交互式? --> 非交互处理 : 否

        state 非交互处理 {
            [*] --> 恩惠期?
            恩惠期? --> stderr警告 : 是
            恩惠期? --> 退出1 : 否 (强制)
        }
    }

    显示对话 --> 用户选择
    用户选择 --> 接受 : 同意
    用户选择 --> 稍后 : 恩惠期内跳过

    接受 --> 上报API
    稍后 --> 记录查看时间
```

---

## 16. 插件命令加载

**文件**: `src/utils/plugins/loadPluginCommands.ts`

```mermaid
flowchart TD
    PLUGIN["插件清单"] --> SCAN["扫描 commandsPaths + skillsPaths"]

    SCAN --> SKILL_CHECK{"SKILL.md 存在?"}
    SKILL_CHECK -->|是| SKILL_MODE["技能模式<br/>同目录 .md 被忽略"]
    SKILL_CHECK -->|否| CMD_MODE["命令模式<br/>每个 .md = 一个命令"]

    SCAN --> METADATA["清单元数据覆盖"]
    METADATA --> FIELDS["name, description, model,<br/>allowed-tools, effort"]

    subgraph 变量替换["变量替换"]
        V1["${CLAUDE_PLUGIN_ROOT}"]
        V2["${CLAUDE_PLUGIN_DATA}"]
        V3["${CLAUDE_SESSION_ID}"]
        V4["${user_config.X}<br/>敏感值 → [sensitive-key: X]"]
    end

    subgraph 命名["命名规则"]
        PREFIX["pluginName:commandName"]
        SUBDIR["pluginName:subdir (SKILL.md)"]
    end
```

---

## 17. 首个 Token 日期追踪

**文件**: `src/services/api/firstTokenDate.ts`

```mermaid
flowchart LR
    LOGIN["用户首次登录"] --> CHECK{"claudeCodeFirstTokenDate<br/>已定义?"}
    CHECK -->|是| SKIP["跳过"]
    CHECK -->|否| FETCH["GET /api/organization/claude_code_first_token_date"]
    FETCH --> VALIDATE["日期格式验证"]
    VALIDATE --> SAVE["缓存到 globalConfig"]
```

---

## 18. 虚拟滚动优化

**文件**: `src/hooks/useVirtualScroll.ts`

```
关键参数:
- SCROLL_QUANTUM = 40 行 (减少 React commit 频率)
- PESSIMISTIC_HEIGHT = 1 (确保装载范围到达底部)
- COLD_START_COUNT = 30 (ViewportHeight=0 前装载 30 项)
- MAX_MOUNTED_ITEMS = 300 (防止纤维爆炸)
```

---

## 19. 选择与复制

**文件**: `src/ink/selection.ts`, `src/hooks/useCopyOnSelect.ts`

```mermaid
flowchart TD
    MOUSE["鼠标拖拽"] --> SELECTION["选择区域"]
    MULTI_CLICK["多击检测"] --> SELECTION

    SELECTION --> ANCHOR["锚点固定"]
    SELECTION --> FOCUS["焦点移动"]
    SELECTION --> SCROLL["滚动时锚点捕获"]

    SELECTION --> COPY{"copyOnSelect?"}
    COPY -->|是| CLIPBOARD["自动写入剪贴板"]
    COPY -->|否| MANUAL["手动复制"]

    subgraph 键盘["键盘选择"]
        SHIFT_ARROW["Shift+Arrow"]
        SHIFT_ARROW --> EXTEND["扩展选择"]
    end
```

---

## 20. API Bootstrap 预加载

**文件**: `src/services/api/bootstrap.ts`

```mermaid
flowchart TD
    STARTUP["启动时"] --> BOOTSTRAP["GET /api/claude_cli/bootstrap"]

    BOOTSTRAP --> AUTH{"认证方式"}
    AUTH -->|"OAuth (优先)"| OAUTH["Bearer token<br/>+ user:profile"]
    AUTH -->|"API 密钥 (回退)"| APIKEY["x-api-key"]

    BOOTSTRAP --> RESULT["返回可选模型列表<br/>+ 配置数据"]
    RESULT --> CACHE_CHECK{"数据变化?"}
    CACHE_CHECK -->|否| SKIP_WRITE["跳过磁盘写入"]
    CACHE_CHECK -->|是| WRITE["更新缓存文件"]
```

---

## 场景统计

| 批次 | 文档 | 新增场景 | 累计 |
|------|------|---------|------|
| 第一批 | 18-application-scenarios.md | 20 | 20 |
| 第二批 | 19-hooks-lifecycle.md + 20-more-scenarios.md | 20 + 25 | 65 |
| 第三批 | 本文档 | 20 | **85+** |

覆盖层面：API 子系统（会话同步/推荐/超额/指标/文件/配额/Bootstrap）、渲染引擎（Ink 缓存/布局/选择）、IDE 集成（连接/选择/直连）、语音模式（平台检测/音频捕获）、Swarm 高级（权限同步/共享路径/进程隔离）、隐私合规（Grove 完整流程）。
