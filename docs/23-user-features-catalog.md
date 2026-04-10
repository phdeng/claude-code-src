# 23 - 用户功能完整目录（第五批）

> 最终一轮：面向用户的命令、UI 组件、账户管理、代码分析、移动/桌面集成等。

---

## 总览：50+ 斜杠命令分类

```mermaid
graph TD
    subgraph 会话管理["会话管理"]
        RESUME["/resume 恢复"]
        SESSION["/session 信息"]
        COMPACT_CMD["/compact 压缩"]
        EXPORT_CMD["/export 导出"]
        CLEAR_CMD["/clear 清屏"]
        RENAME_CMD["/rename 重命名"]
        BRANCH_CMD["/branch 分支"]
        REWIND_CMD["/rewind 回退"]
    end

    subgraph 代码分析["代码分析"]
        REVIEW_CMD["/review 代码审查"]
        ULTRAREVIEW["/ultrareview 深度审查"]
        SEC_REVIEW["/security-review 安全审查"]
        DIFF_CMD["/diff 查看差异"]
        PR_COMMENTS["/pr_comments PR评论"]
        SIMPLIFY_CMD["/simplify 代码优化"]
    end

    subgraph 账户管理["账户管理"]
        LOGIN_CMD["/login 登录"]
        LOGOUT_CMD["/logout 登出"]
        UPGRADE_CMD["/upgrade 升级"]
        EXTRA_USAGE["/extra-usage 额外用量"]
        RATE_OPTS["/rate-limit-options 限制选项"]
        USAGE_CMD["/usage 使用量"]
        COST_CMD["/cost 费用"]
    end

    subgraph 配置调优["配置调优"]
        CONFIG_CMD["/config 设置"]
        MODEL_CMD["/model 模型"]
        FAST_CMD["/fast 快速模式"]
        EFFORT_CMD["/effort 推理力度"]
        THEME_CMD["/theme 主题"]
        VIM_CMD["/vim Vim模式"]
        KEYBIND_CMD["/keybindings 快捷键"]
        PERM_CMD["/permissions 权限"]
        HOOKS_CMD["/hooks 钩子"]
        OUTPUT_CMD["/output-style 输出风格"]
        SANDBOX_CMD["/sandbox-toggle 沙箱"]
    end

    subgraph 集成功能["集成功能"]
        MCP_CMD["/mcp 管理"]
        SKILLS_CMD["/skills 技能"]
        PLUGIN_CMD["/plugin 插件"]
        AGENTS_CMD["/agents 代理"]
        IDE_CMD["/ide IDE"]
        CHROME_CMD["/chrome Chrome"]
        MOBILE_CMD["/mobile 移动端"]
        DESKTOP_CMD["/desktop 桌面"]
    end

    subgraph 诊断信息["诊断信息"]
        DOCTOR_CMD["/doctor 诊断"]
        CONTEXT_CMD["/context 上下文"]
        STATUS_CMD["/status 状态"]
        STATS_CMD["/stats 统计"]
        FILES_CMD["/files 文件列表"]
        DEBUG_CMD["/debug 调试"]
    end

    subgraph 通信协作["通信协作"]
        SHARE_CMD["/share 分享"]
        FEEDBACK_CMD["/feedback 反馈"]
        BTW_CMD["/btw 顺便说"]
        ADVISOR_CMD["/advisor 顾问"]
        TASKS_CMD["/tasks 任务"]
    end

    subgraph 高级功能["高级功能"]
        PLAN_CMD["/plan 计划模式"]
        PASSES_CMD["/passes 多轮"]
        VOICE_CMD["/voice 语音"]
        MEMORY_CMD["/memory 记忆"]
        STICKERS_CMD["/stickers 贴纸"]
    end
```

---

## 1. 代码审查系统

### /review — 本地代码审查

**文件**: `src/commands/review.ts`

```mermaid
flowchart TD
    USER["/review"] --> DIFF["git diff 获取变更"]
    DIFF --> PROMPT["生成审查提示词"]
    PROMPT --> MODEL["模型分析代码"]
    MODEL --> RESULT["审查结果:<br/>问题/建议/改进"]

    subgraph ultrareview["/ultrareview"]
        UR_DESC["深度审查 (远程 BugHunter)"]
        UR_CHECK{"审查配额?"}
        UR_CHECK -->|超限| UR_DIALOG["超额权限对话框"]
        UR_CHECK -->|有余| UR_RUN["远程执行"]
    end
```

### /security-review — 安全专项审查

```mermaid
flowchart TD
    SEC["/security-review"] --> TOOLS["允许工具:<br/>Bash(git*), Read, Glob, Grep"]
    TOOLS --> FOCUS["聚焦检测"]

    FOCUS --> F1["注入漏洞 (SQL/XSS/命令)"]
    FOCUS --> F2["认证缺陷"]
    FOCUS --> F3["加密问题"]
    FOCUS --> F4["序列化风险"]

    FOCUS --> EXCLUDE["排除 (低置信度):<br/>DoS, 秘密泄露, 速率限制"]

    FOCUS --> REPORT["仅报告高置信度漏洞"]
```

---

## 2. 账户管理与订阅

### /login — 登录流程

**文件**: `src/commands/login/login.tsx`

```mermaid
sequenceDiagram
    participant User as 用户
    participant CLI as Claude Code
    participant OAuth as OAuth 流
    participant Cache as 缓存系统

    User->>CLI: /login

    CLI->>OAuth: ConsoleOAuthFlow
    OAuth-->>CLI: 认证成功

    par 登录后并行刷新
        CLI->>Cache: GrowthBook 刷新
        CLI->>Cache: 策略限制刷新
        CLI->>Cache: 远程管理设置刷新
    end

    CLI->>CLI: 重置 auto mode killswitch
    CLI->>CLI: 重置 bypass 权限
    CLI->>CLI: authVersion++
    CLI->>CLI: 注册受信设备 (Remote Control)
```

### /upgrade — 升级流程

```mermaid
flowchart TD
    UPGRADE["/upgrade"] --> CHECK{"当前订阅?"}

    CHECK -->|"已是 Max 20x"| MAX["已是最高等级"]
    CHECK -->|"使用 API 密钥"| API_SWITCH["提示切换到<br/>Claude.ai 账户"]
    CHECK -->|"其他"| OPEN["打开 Claude.ai 升级页面"]
```

### /extra-usage — 额外用量

```mermaid
flowchart TD
    EXTRA["/extra-usage"] --> AUTH{"已登录?"}
    AUTH -->|否| LOGIN["先执行 /login"]
    AUTH -->|是| CHECK{"Team/Enterprise?"}
    CHECK -->|是| PURCHASE["购买额外用量"]
    CHECK -->|否| UNAVAIL["不可用"]
```

### /rate-limit-options — 限制选项菜单

```mermaid
flowchart TD
    RATE["/rate-limit-options"] --> MENU["显示选项"]

    MENU --> OPT1["升级订阅 (/upgrade)"]
    MENU --> OPT2["购买额外用量 (/extra-usage)"]

    MENU --> CHECKS["检查"]
    CHECKS --> C1["Claude AI 额度状态"]
    CHECKS --> C2["Team/Enterprise 权限"]
    CHECKS --> C3["超额禁用原因"]
```

---

## 3. 移动端与桌面端集成

### /mobile — 移动 QR 码

**文件**: `src/commands/mobile/mobile.tsx`

```mermaid
flowchart TD
    MOBILE["/mobile"] --> QR["生成 QR 码"]
    QR --> PLATFORM{"用户选择平台"}
    PLATFORM -->|iOS| APPLE["Apple App Store 链接"]
    PLATFORM -->|Android| GOOGLE["Google Play 链接"]
    PLATFORM --> SCAN["扫描 QR 码<br/>连接到当前会话"]
```

### /desktop — 桌面交接

```mermaid
flowchart LR
    DESKTOP["/desktop"] --> HANDOFF["DesktopHandoff 组件"]
    HANDOFF --> SWITCH["跨设备会话切换<br/>CLI ↔ Desktop App"]
```

---

## 4. 对话框系统

**文件**: `src/dialogLaunchers.tsx`, `src/interactiveHelpers.tsx`

```mermaid
graph TD
    subgraph 对话框["可启动的对话框"]
        D1["SnapshotUpdateDialog<br/>代理内存快照更新"]
        D2["InvalidSettingsDialog<br/>设置验证错误"]
        D3["AssistantSessionChooser<br/>选择 Bridge 会话"]
        D4["AssistantInstallWizard<br/>助手安装向导"]
        D5["AutoModeOptInDialog<br/>自动模式确认"]
        D6["ConsoleOAuthFlow<br/>OAuth 认证"]
        D7["ExportDialog<br/>导出会话"]
        D8["FeedbackSurvey<br/>反馈调查"]
        D9["GroveDialog<br/>隐私政策同意"]
        D10["IdeOnboardingDialog<br/>IDE 入门"]
    end

    subgraph 工具函数["工具函数"]
        SHOW["showDialog&lt;T&gt;()<br/>通用对话框渲染"]
        SETUP_DIALOG["showSetupDialog()<br/>带 AppStateProvider"]
        EXIT_ERR["exitWithError()<br/>优雅错误退出"]
        EXIT_MSG["exitWithMessage()<br/>优雅消息退出"]
    end
```

---

## 5. 消息组件生态

**文件**: `src/components/messages/` (33 个组件)

```mermaid
graph TD
    subgraph 核心消息["核心消息类型"]
        M1["AssistantMessage<br/>模型回复"]
        M2["AssistantThinkingMessage<br/>思考过程"]
        M3["AssistantRedactedThinkingMessage<br/>编辑后思考"]
        M4["AdvisorMessage<br/>顾问建议"]
    end

    subgraph 系统消息["系统消息"]
        M5["SystemAPIErrorMessage<br/>API 错误"]
        M6["RateLimitMessage<br/>速率限制"]
        M7["ShutdownMessage<br/>优雅关闭"]
        M8["HookProgressMessage<br/>钩子进度"]
    end

    subgraph 代理消息["代理/任务消息"]
        M9["TaskAssignmentMessage<br/>任务分配"]
        M10["UserAgentNotificationMessage<br/>代理通知"]
        M11["UserResourceUpdateMessage<br/>资源更新"]
    end

    subgraph 交互消息["交互消息"]
        M12["PermissionRequest<br/>权限请求"]
        M13["CompactSummary<br/>压缩摘要"]
        M14["InterruptedByUser<br/>用户中断"]
    end
```

---

## 6. BTW (顺便说) 侧面问题

**文件**: `src/commands/btw/btw.tsx`

```mermaid
flowchart TD
    BTW["/btw"] --> MODAL["模态框打开"]
    MODAL --> FRAME["帧动画渲染<br/>80ms 间隔"]
    FRAME --> SCROLL["上/下箭头滚动"]
    SCROLL --> INPUT["输入侧面问题"]
    INPUT --> SKIP["Escape/Return/Space<br/>跳过/提交"]
```

---

## 7. Thinkback 年度回顾

**文件**: `src/commands/thinkback/thinkback.tsx`

```mermaid
flowchart TD
    THINK["/think-back"] --> GATE{"GrowthBook<br/>tengu_thinkback?"}
    GATE -->|启用| PLUGIN["加载 Thinkback 插件<br/>thinkback@{marketplace}"]
    PLUGIN --> ANIM["播放年度回顾动画<br/>year_in_review.js"]
    GATE -->|禁用| UNAVAIL["功能不可用"]

    REPLAY["/thinkback-play"] --> EXTRACT["提取动画文件"]
    EXTRACT --> PLAY["重放动画"]
```

---

## 8. Ultraplan 多代理规划

**文件**: `src/commands/ultraplan.tsx`

```mermaid
flowchart TD
    ULTRA["/ultraplan"] --> TIMEOUT["CCR 30 分钟超时"]
    TIMEOUT --> EXPLORE["多代理探索阶段"]
    EXPLORE --> REMOTE["注册远程代理任务"]
    REMOTE --> PLAN["规划阶段"]
    PLAN --> VOTE["退出计划模式投票"]

    subgraph 覆盖["自定义覆盖"]
        ENV["ULTRAPLAN_PROMPT_FILE<br/>自定义提示词文件"]
    end
```

---

## 9. PR 评论集成

**文件**: `src/commands/pr_comments/index.ts`

```mermaid
flowchart TD
    PR["/pr_comments [PR_URL]"] --> FETCH["gh pr view --json"]
    FETCH --> COMMENTS["提取评论"]

    COMMENTS --> REVIEW_C["代码审查评论<br/>带 diff 块 + 行号"]
    COMMENTS --> ISSUE_C["PR 级别评论"]

    REVIEW_C & ISSUE_C --> FORMAT["格式化上下文"]
    FORMAT --> INJECT["注入到对话"]
```

---

## 10. Diff 查看器

**文件**: `src/commands/diff/diff.tsx`

```mermaid
flowchart TD
    DIFF_CMD["/diff"] --> DIALOG["DiffDialog 组件"]
    DIALOG --> HISTORY["消息历史差异"]
    HISTORY --> INTERACTIVE["交互式浏览<br/>逐文件查看"]
```

---

## 11. 设置期间的初始化细节

**文件**: `src/setup.ts:80-180`

```mermaid
flowchart TD
    SETUP["setup() 后半部分"]

    SETUP --> UDS["UDS 消息服务器启动<br/>(Mac/Linux)"]
    SETUP --> SNAPSHOT["队友快照捕获系统"]
    SETUP --> TERMINAL["终端备份恢复检测<br/>(iTerm2/Terminal.app)"]
    SETUP --> FILEWATCHER["文件变更监视器初始化"]
    SETUP --> WORKTREE_INIT["工作树创建流程"]
    SETUP --> MIGRATION["执行 11 个迁移"]
```

---

## 12. 环境诊断 (/doctor)

```mermaid
flowchart TD
    DOCTOR["/doctor"] --> CHECKS["诊断检查"]

    CHECKS --> C1["Node.js 版本 (≥18)"]
    CHECKS --> C2["Git 安装和配置"]
    CHECKS --> C3["API 密钥 / OAuth 状态"]
    CHECKS --> C4["MCP 服务器连接"]
    CHECKS --> C5["插件加载状态"]
    CHECKS --> C6["沙箱依赖"]
    CHECKS --> C7["网络连通性"]
    CHECKS --> C8["磁盘空间"]

    CHECKS --> REPORT["诊断报告<br/>✓ 通过 / ✗ 失败 / ⚠ 警告"]
```

---

## 13. Summary 命令

**文件**: `src/commands/summary/`

```
/summary → 生成当前对话摘要
  - 使用快速模型
  - 1-3 句概括
  - 关键决策和结果
```

---

## 14. Copy 命令

```
/copy → 复制最后一条助手消息到剪贴板
  - 支持指定消息索引
  - Markdown 格式保留
```

---

## 15. Context 命令

```
/context → 显示当前上下文信息
  - Token 使用量
  - 系统提示大小
  - 工具数量
  - CLAUDE.md 大小
  - 记忆文件列表
```

---

## 16. 内部专用命令 (Ant)

```mermaid
graph TD
    subgraph 内部命令["仅 Ant 内部"]
        INT1["/commit — Git 提交"]
        INT2["/commit-push-pr — 提交+推送+PR"]
        INT3["/share — 上传会话"]
        INT4["/issue — 报告问题"]
        INT5["/good-claude — 正面反馈"]
        INT6["/teleport — 跨环境迁移"]
        INT7["/insights — 使用分析"]
        INT8["/backfill-sessions — 回填"]
        INT9["/mock-limits — 模拟限制"]
        INT10["/debug-tool-call — 调试工具"]
        INT11["/bridge-kick — Bridge 故障注入"]
        INT12["/reset-limits — 重置限制"]
        INT13["/ant-trace — 跟踪"]
        INT14["/perf-issue — 性能问题"]
        INT15["/ctx_viz — 上下文可视化"]
        INT16["/version — 版本信息"]
    end

    style 内部命令 fill:#fdd
```

---

## 17. commit-push-pr 工作流

**文件**: `src/commands/commit-push-pr.ts`

```mermaid
flowchart TD
    CPR["/commit-push-pr"] --> STEP1["1. Git 提交<br/>(含 simplify 审查)"]
    STEP1 --> STEP2["2. 推送到远程"]
    STEP2 --> STEP3["3. 创建/编辑 PR"]
    STEP3 --> STEP4{"4. Slack 发布?"}
    STEP4 -->|可选| SLACK["发送到 Slack"]
    STEP4 -->|跳过| DONE["完成"]

    subgraph 差异["内部 vs 外部"]
        INTERNAL["内部: 完整属性"]
        EXTERNAL["外部: 简化属性"]
    end
```

---

## 18. Grove 隐私 UI

**文件**: `src/components/grove/Grove.tsx`

```mermaid
flowchart TD
    GROVE["Grove 对话框"] --> PHASE{"当前阶段?"}

    PHASE -->|"恩惠期"| GRACE["可跳过的同意"]
    GRACE --> CHOICE1["接受"]
    GRACE --> CHOICE2["稍后再说"]

    PHASE -->|"后恩惠期"| FORCE["强制同意"]
    FORCE --> ACCEPT["必须接受<br/>才能继续使用"]

    subgraph 内容["对话框内容"]
        TERMS["消费者条款更新"]
        PRIVACY["隐私政策更新"]
        TRAINING["数据训练选择<br/>(可选退出)"]
        RETENTION["数据留存政策"]
    end
```

---

## 累计文档统计

| 文档 | 场景数 | 累计 |
|------|--------|------|
| 01-12 | 架构基础 | - |
| 13 | 隐藏功能 | - |
| 14 | 提示词目录 | - |
| 15-17 | 技能/代理/团队 | - |
| 18 | 应用场景 (第一批) | 20 |
| 19 | Hook 生命周期 | 45 |
| 20 | 更多场景 (第二批) | 65 |
| 21 | 高级场景 (第三批) | 85 |
| 22 | 深层内部 (第四批) | 105 |
| **23** | **用户功能 (第五批)** | **125+** |

至此，`docs/` 目录共 **24 份文档**，累计 **125+ 个应用场景**，覆盖了 Claude Code 源码中从底层引擎到用户命令的全部功能路径。
