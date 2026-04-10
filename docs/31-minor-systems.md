# 31 - 小型系统补遗

> 最终补充：8 个独立的小型系统，每个用一张图概括。

---

## 1. 后台维护调度 (backgroundHousekeeping)

**文件**: `src/utils/backgroundHousekeeping.ts`

```mermaid
flowchart TD
    IDLE["会话空闲时"] --> SCHEDULE["后台维护调度器"]

    SCHEDULE --> DREAM["AutoDream<br/>记忆巩固 (24h+5会话)"]
    SCHEDULE --> MAGIC["MagicDocs<br/>自动文档更新"]
    SCHEDULE --> EXTRACT["ExtractMemories<br/>记忆提取"]
    SCHEDULE --> CLEANUP["缓存清理<br/>旧文件/过期数据"]

    subgraph 条件["触发条件"]
        NOT_BUSY["主循环非活跃"]
        THROTTLE["节流: 避免频繁触发"]
    end
```

统一调度 AutoDream、MagicDocs、ExtractMemories 等后台任务，确保不干扰用户交互。

---

## 2. 并发会话管理 (concurrentSessions)

**文件**: `src/utils/concurrentSessions.ts`

```mermaid
flowchart TD
    START["新会话启动"] --> DETECT["检测同目录其他会话"]

    DETECT --> LOCK["进程锁检查<br/>(PID 文件)"]
    LOCK --> ALIVE{"PID 仍存活?"}
    ALIVE -->|是| WARN["警告: 并发会话<br/>可能冲突"]
    ALIVE -->|否| STALE["清理过期锁"]

    WARN --> USER["用户决定:<br/>继续 / 退出"]
```

防止同一项目目录下多个 Claude Code 实例互相干扰（文件编辑冲突等）。

---

## 3. 自动更新 (autoUpdater)

**文件**: `src/utils/autoUpdater.ts`

```mermaid
flowchart TD
    CHECK["启动时检查"] --> FETCH["获取最新版本信息"]
    FETCH --> COMPARE{"当前版本 < 最新?"}

    COMPARE -->|是| NOTIFY["通知用户有更新"]
    COMPARE -->|否| SKIP["已是最新"]

    NOTIFY --> AUTO{"自动更新启用?"}
    AUTO -->|是| INSTALL["后台下载 + 安装"]
    AUTO -->|否| MANUAL["显示 claude --update"]

    INSTALL --> RESTART["下次启动生效"]
```

---

## 4. 终端录制 (asciicast)

**文件**: `src/utils/asciicast.ts`

```mermaid
flowchart LR
    SESSION["终端会话"] --> RECORD["录制 asciicast 格式"]
    RECORD --> FILE[".cast 文件"]
    FILE --> PLAY["asciinema play 回放"]
    FILE --> SHARE["/share 上传"]
```

将终端交互录制为 [asciicast](https://docs.asciinema.org/manual/asciicast/v2/) 格式，支持回放和分享。

---

## 5. Claude Desktop 集成 (claudeDesktop)

**文件**: `src/utils/claudeDesktop.ts`

```mermaid
flowchart TD
    DETECT["检测 Claude Desktop 安装"] --> CONFIG["读取 Desktop MCP 配置"]
    CONFIG --> MERGE["合并到 CLI 的 MCP 设置"]
    MERGE --> SHARE["共享 MCP 服务器<br/>(Desktop ↔ CLI)"]
```

自动检测本机 Claude Desktop 应用的 MCP 服务器配置，合并到 CLI 使用，避免重复配置。

---

## 6. 上下文优化建议 (contextSuggestions)

**文件**: `src/utils/contextSuggestions.ts`

```mermaid
flowchart TD
    ANALYZE["分析当前上下文"] --> SUGGEST["生成优化建议"]

    SUGGEST --> S1["token 使用过高 → /compact"]
    SUGGEST --> S2["工具结果过大 → 微压缩"]
    SUGGEST --> S3["对话过长 → 分支/新会话"]
    SUGGEST --> S4["缓存命中率低 → 检查系统提示"]
```

分析上下文窗口使用情况，向用户或模型建议优化操作。

---

## 7. 活动时间追踪 (activityManager)

**文件**: `src/utils/activityManager.ts`

```mermaid
flowchart LR
    EVENTS["用户操作<br/>API 调用<br/>工具执行"] --> TRACK["记录时间戳"]
    TRACK --> METRICS["活跃时间统计"]
    METRICS --> DISPLAY["/stats 命令显示"]
    METRICS --> TELEMETRY["遥测上报"]
```

追踪用户/CLI 活动时间，用于 `/stats` 显示和遥测分析。

---

## 8. 智能会话搜索 (agenticSessionSearch)

**文件**: `src/utils/agenticSessionSearch.ts`

```mermaid
flowchart TD
    QUERY["用户搜索: '上周修了那个 bug'"] --> LLM["LLM 分析搜索意图"]
    LLM --> SCAN["扫描会话 transcript"]
    SCAN --> MATCH["语义匹配"]
    MATCH --> RESULTS["返回相关会话列表"]
    RESULTS --> RESUME["用户选择 → /resume"]
```

使用 LLM 语义搜索历史会话（不仅是关键词匹配），支持自然语言描述找到过去的对话。

---

## 消息折叠系统 (4 个 collapse 工具)

这些不值得独立文档，但值得一提——它们优化了消息显示的信噪比：

| 文件 | 折叠内容 |
|------|---------|
| `collapseBackgroundBashNotifications.ts` | 后台 Bash 完成通知 → 单行摘要 |
| `collapseReadSearch.ts` | 连续 Read/Search 调用 → 合并显示 |
| `collapseTeammateShutdowns.ts` | 多个队友关闭事件 → 单条通知 |
| `collapseHookSummaries.ts` | 并行工具钩子摘要 → 合并 |

---

## 文档完成度

```mermaid
pie title 源码覆盖率评估
    "已完整文档化 (85%)" : 85
    "本文档补全 (8%)" : 8
    "细粒度工具函数 (5%)" : 5
    "UI 样式细节 (2%)" : 2
```

剩余 ~7% 为约 200 个独立工具函数（如 `CircularBuffer.ts`、`Cursor.ts`、`combinedAbortSignal.ts` 等），属于纯工程基础设施，无独立的用户功能或架构模式，不需要专题文档。

**至此，31 份文档体系基本完成。**
