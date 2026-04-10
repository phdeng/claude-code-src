# 30 - 文档缺口补全

> 质量审计发现的 4 个严重缺口 + 6 个中等缺口的补全。

---

## 1. Computer Use (计算机使用) — 🔴 严重缺口

**文件**: `src/utils/computerUse/` (15 文件)  
**门控**: `feature('CHICAGO_MCP')`

```mermaid
flowchart TD
    ENABLE["启用条件:<br/>feature('CHICAGO_MCP')<br/>+ macOS 平台"]

    ENABLE --> SETUP["setup.ts<br/>初始化 MCP 服务器"]
    SETUP --> EXECUTOR["executor.ts<br/>CLI 适配器"]

    EXECUTOR --> RUST["@ant/computer-use-input<br/>(Rust/enigo 后端)"]
    EXECUTOR --> SWIFT["@ant/computer-use-swift<br/>(Swift 后端)"]

    RUST --> MOUSE["鼠标控制<br/>移动、点击、拖拽"]
    RUST --> KEYBOARD["键盘控制<br/>按键、组合键、输入文本"]

    SWIFT --> SCREENSHOT["屏幕截图<br/>(NSWorkspace)"]
    SWIFT --> APP_DETECT["应用检测<br/>(前台应用名)"]
    SWIFT --> TCC["TCC 权限管理<br/>(辅助功能权限)"]

    subgraph CLI特殊["CLI 特殊处理"]
        NO_WINDOW["终端作为代理主机<br/>无窗口穿透"]
        CLIPBOARD["剪贴板通过<br/>pbcopy/pbpaste<br/>(无 Electron)"]
    end

    subgraph 安全["安全机制"]
        ALLOWLIST["应用允许列表<br/>(appNames.ts)"]
        GATES["前台门控<br/>(gates.ts)"]
        LOCK["自动隐藏 + 锁定释放"]
    end

    EXECUTOR --> CLI特殊
    EXECUTOR --> 安全

    MCP_SERVER["mcpServer.ts<br/>MCP 服务器接口"] --> EXECUTOR
    TOOL_RENDER["toolRendering.tsx<br/>操作 UI 渲染"] --> EXECUTOR
    CLEANUP["cleanup.ts<br/>资源清理"] --> EXECUTOR
```

**核心文件**:
| 文件 | 职责 |
|------|------|
| `executor.ts` | CLI 适配器（包装 Rust/Swift 模块） |
| `mcpServer.ts` | MCP 服务器接口（工具暴露） |
| `setup.ts` / `cleanup.ts` | 生命周期管理 |
| `appNames.ts` | 应用名称白名单 |
| `gates.ts` | 前台应用门控 |
| `hostAdapter.ts` | CLI vs Cowork 适配 |
| `toolRendering.tsx` | 操作结果 UI |

**平台限制**: 仅 macOS（依赖 Swift + TCC 辅助功能权限）

---

## 2. GitHub App 安装向导 — 🔴 严重缺口

**文件**: `src/commands/install-github-app/` (14 文件)

```mermaid
sequenceDiagram
    participant User as 用户
    participant Wizard as 安装向导
    participant GH as GitHub
    participant API as Claude API

    User->>Wizard: /install-github-app

    Note over Wizard: Step 1: CheckGitHubStep
    Wizard->>GH: 检查 gh CLI 认证
    GH-->>Wizard: 认证状态

    Note over Wizard: Step 2: ApiKeyStep
    Wizard->>API: 创建或选择 API Key

    Note over Wizard: Step 3: ChooseRepoStep
    Wizard->>GH: 列出可用仓库
    User->>Wizard: 选择目标仓库

    Note over Wizard: Step 4: OAuthFlowStep
    Wizard->>GH: OAuth 认证流程
    GH-->>Wizard: 授权完成

    Note over Wizard: Step 5: ExistingWorkflowStep
    Wizard->>GH: 检测已有工作流
    
    Note over Wizard: Step 6: InstallAppStep
    Wizard->>GH: 安装 GitHub App

    Note over Wizard: Step 7: setupGitHubActions
    Wizard->>GH: 配置 GitHub Actions
    Note over GH: 支持的工作流:<br/>- Claude Commits<br/>- Claude Review<br/>- 自定义工作流
```

**核心文件**:
| 文件 | 职责 |
|------|------|
| `install-github-app.tsx` (87KB) | 主向导组件 |
| `CheckGitHubStep.tsx` | GitHub 认证检查 |
| `ApiKeyStep.tsx` | API Key 创建/选择 |
| `ChooseRepoStep.tsx` | 仓库选择 |
| `OAuthFlowStep.tsx` | OAuth 授权流 |
| `ExistingWorkflowStep.tsx` | 已有工作流检测 |
| `InstallAppStep.tsx` | App 安装 |
| `setupGitHubActions.ts` | Actions YAML 生成 |

---

## 3. 设置同步 (Settings Sync) — 🔴 严重缺口

**文件**: `src/services/settingsSync/` (2 文件)

```mermaid
flowchart TD
    subgraph 交互CLI["交互式 CLI 模式"]
        LOCAL_CHANGE["本地设置变更"] --> UPLOAD["增量上传到远程<br/>(anthropic API)"]
    end

    subgraph CCR["CCR (Web) 模式"]
        REMOTE_CHANGE["远程设置变更"] --> DOWNLOAD["下载到本地<br/>(插件安装前执行)"]
    end

    subgraph 同步项目["同步内容"]
        S1["插件配置"]
        S2["快捷键绑定"]
        S3["主题设置"]
        S4["模型偏好"]
        S5["权限规则"]
    end

    UPLOAD --> API["Backend API<br/>anthropic/anthropic#218817"]
    DOWNLOAD --> API

    subgraph 门控["启用条件"]
        UPLOAD_GATE["feature('UPLOAD_USER_SETTINGS')"]
        DOWNLOAD_GATE["feature('DOWNLOAD_USER_SETTINGS')"]
    end
```

---

## 4. 原生安装器 (Native Installer) — 🔴 严重缺口

**文件**: `src/utils/nativeInstaller/` (5 文件)

```mermaid
flowchart TD
    UPDATE["claude --update"] --> INSTALLER["installer.ts"]

    INSTALLER --> STRUCTURE["目录结构管理"]
    STRUCTURE --> DIR["~/.local/bin/claude<br/>(符号链接 → 版本)"]
    STRUCTURE --> VERSIONS["~/.claude/versions/<br/>├── v1.0.0/<br/>├── v1.1.0/<br/>└── current → v1.1.0"]

    INSTALLER --> DOWNLOAD["download.ts<br/>版本下载"]
    DOWNLOAD --> LATEST["latest 版本"]
    DOWNLOAD --> STABLE["stable 版本"]
    DOWNLOAD --> SPECIFIC["指定版本"]

    INSTALLER --> LOCK["pidLock.ts<br/>多进程安全锁"]
    LOCK --> PID["PID 文件<br/>防并发安装"]

    INSTALLER --> PKG["packageManagers.ts<br/>包管理器集成"]
    PKG --> HOMEBREW["Homebrew"]
    PKG --> APT["APT"]
    PKG --> NIX["Nix"]
    PKG --> NPM["npm (回退)"]

    subgraph 回退["回退机制"]
        ROLLBACK["安装失败时<br/>恢复上一版本<br/>(基于修改时间)"]
    end
```

---

## 5. 欢迎屏幕 (LogoV2) — 🟡 中等缺口

**文件**: `src/components/LogoV2/` (15 文件)

```mermaid
graph TD
    LOGO["LogoV2 (75KB)"] --> ELEMENTS["组成元素"]

    ELEMENTS --> CLAWD["Clawd 角色<br/>AnimatedClawd.tsx"]
    ELEMENTS --> WELCOME["WelcomeV2.tsx (57KB)<br/>欢迎消息面板"]
    ELEMENTS --> FEED["FeedColumn.tsx<br/>近期活动源"]
    ELEMENTS --> CONDENSED["CondensedLogo.tsx<br/>紧凑版"]

    WELCOME --> W1["最近活动"]
    WELCOME --> W2["版本说明 (What's New)"]
    WELCOME --> W3["项目入门引导"]
    WELCOME --> W4["升级提示"]
    WELCOME --> W5["访客通行证"]
    WELCOME --> W6["超额额度提示"]

    FEED --> F_CONFIG["feedConfigs.tsx<br/>内容源配置"]
    FEED --> F_TIP["EmergencyTip.tsx<br/>紧急提示"]
    FEED --> F_VOICE["VoiceModeNotice.tsx"]
    FEED --> F_OPUS["Opus1mMerge 通知"]
    FEED --> F_CHANNEL["ChannelsNotice.tsx"]
```

---

## 6. Deep Link 系统 (Lodestone) — 🟡 中等缺口

**文件**: `src/utils/deepLink/` (6 文件)

```mermaid
flowchart TD
    URI["claude-cli://open?q=...&cwd=...&repo=..."]

    URI --> PARSE["parseDeepLink.ts"]
    PARSE --> PARAMS["参数提取"]
    PARAMS --> Q["q: 预填提示 (未提交)"]
    PARAMS --> CWD["cwd: 工作目录"]
    PARAMS --> REPO["repo: owner/name 仓库"]

    PARSE --> SECURITY["安全处理"]
    SECURITY --> URL_DECODE["URL 解码"]
    SECURITY --> UNICODE_CLEAN["Unicode 净化"]
    SECURITY --> SHELL_ESCAPE["Shell 转义"]

    URI --> REGISTER["registerProtocol.ts<br/>协议注册 (OS 级)"]
    URI --> HANDLE["protocolHandler.ts<br/>协议处理"]
    URI --> LAUNCH["terminalLauncher.ts<br/>打开终端"]

    subgraph 来源["触发来源"]
        BROWSER["浏览器链接"]
        SCRIPT["脚本/CI"]
        COMPANION["桌面应用"]
    end

    来源 --> URI
```

---

## 7. Tips 服务 — 🟡 中等缺口

**文件**: `src/services/tips/` (3 文件)

```mermaid
flowchart TD
    REGISTRY["tipRegistry.ts<br/>提示词库 (23KB)"]
    SCHEDULER["tipScheduler.ts<br/>显示时机调度"]
    HISTORY["tipHistory.ts<br/>历史追踪 (防重复)"]

    REGISTRY --> SCHEDULER
    HISTORY --> SCHEDULER

    SCHEDULER --> DISPLAY["集成到 LogoV2<br/>EmergencyTip.tsx"]
    
    subgraph 类似["类似功能"]
        IDE_TIP["VS Code: Tip of the Day"]
    end
```

---

## 8. 输入建议系统 — 🟡 中等缺口

**文件**: `src/utils/suggestions/` (5 文件)

```mermaid
flowchart TD
    INPUT["用户输入"] --> SUGGEST["建议系统"]

    SUGGEST --> CMD["commandSuggestions.ts<br/>命令补全 (Fuse.js 全文搜索)"]
    SUGGEST --> DIR["directoryCompletion.ts<br/>目录路径补全"]
    SUGGEST --> HIST["shellHistoryCompletion.ts<br/>Shell 历史补全"]
    SUGGEST --> SKILL["skillUsageTracking.ts<br/>技能使用评分排序"]
    SUGGEST --> SLACK["slackChannelSuggestions.ts<br/>Slack 频道建议"]

    CMD & DIR & HIST & SKILL & SLACK --> MERGE["合并 + 排序"]
    MERGE --> DISPLAY["useTypeahead Hook<br/>下拉补全 UI"]
```

---

## 9. CLI 传输层 — 🟡 中等缺口

**文件**: `src/cli/transports/` (7 文件)

```mermaid
graph TD
    subgraph 传输层["CLI 传输协议"]
        SSE["SSETransport<br/>Server-Sent Events"]
        WS["WebSocketTransport<br/>WebSocket 双向"]
        HYBRID["HybridTransport<br/>混合模式"]
        CCR["ccrClient<br/>CCR 客户端"]
        BATCH["SerialBatchEventUploader<br/>批量事件上传"]
        WORKER["WorkerStateUploader<br/>Worker 状态同步"]
        UTILS["transportUtils<br/>工具函数"]
    end

    subgraph 使用场景["使用场景"]
        REMOTE["远程会话 → SSE/WS"]
        SDK["SDK 集成 → CCR"]
        AGENT["代理状态 → Worker"]
    end
```

---

## 10. Ultraplan 完整流程 — 🟡 中等缺口

**文件**: `src/utils/ultraplan/` + `src/commands/ultraplan.tsx`

```mermaid
sequenceDiagram
    participant User as 用户
    participant CLI as Claude CLI
    participant Browser as 浏览器
    participant CCR as Claude.ai

    User->>CLI: /ultraplan [描述]
    CLI->>Browser: 打开 Claude.ai 规划界面
    
    Note over CCR: 30 分钟超时规划
    CCR->>CCR: 多代理探索
    CCR->>CCR: 生成计划文件

    CCR->>CCR: ExitPlanMode 投票
    
    Note over CLI: ccrSession.ts 轮询
    CLI->>CCR: pollRemoteSessionEvents()
    CCR-->>CLI: 计划文本

    CLI->>User: 显示计划 + 请求批准
    
    alt 用户批准
        CLI->>CLI: 执行计划
    else 用户拒绝
        CLI->>User: 返回
    end

    subgraph 自定义["自定义覆盖"]
        ENV_PROMPT["ULTRAPLAN_PROMPT_FILE<br/>自定义提示词文件"]
    end
```

---

## 审计结果总结

| 缺口 | 严重度 | 状态 |
|------|--------|------|
| Computer Use | 🔴 → ✅ | 本文档已补全 |
| GitHub App 安装 | 🔴 → ✅ | 本文档已补全 |
| Settings Sync | 🔴 → ✅ | 本文档已补全 |
| Native Installer | 🔴 → ✅ | 本文档已补全 |
| LogoV2 欢迎屏幕 | 🟡 → ✅ | 本文档已补全 |
| Deep Link | 🟡 → ✅ | 本文档已补全 |
| Tips 服务 | 🟡 → ✅ | 本文档已补全 |
| 输入建议 | 🟡 → ✅ | 本文档已补全 |
| CLI 传输层 | 🟡 → ✅ | 本文档已补全 |
| Ultraplan | 🟡 → ✅ | 本文档已补全 |

**文档覆盖率**: 70% → **~90%**
