# 15 - 技能系统 (Skills System)

## 架构总览

```mermaid
graph TB
    subgraph 技能来源["技能来源"]
        BUNDLED["打包技能<br/>src/skills/bundled/<br/>14 个内置"]
        SKILL_DIR["目录技能<br/>.claude/skills/*.md<br/>~/.claude/skills/*.md"]
        PLUGIN_SK["插件技能<br/>builtinPlugins.ts"]
        MCP_SK["MCP 技能<br/>MCP 服务器 prompts"]
        DYNAMIC["动态技能<br/>运行时发现"]
    end

    subgraph 加载层["加载 & 注册"]
        REG["registerBundledSkill()"]
        LOAD["loadSkillsDir()"]
        PLUG["getBuiltinPluginSkillCommands()"]
        MCP_LOAD["getMcpSkillCommands()"]
    end

    subgraph 聚合层["命令聚合"]
        GET_CMD["getCommands(cwd)"]
        GET_SKILL["getSkillToolCommands(cwd)"]
    end

    subgraph 执行层["执行"]
        SKILL_TOOL["SkillTool<br/>查找 + 调用"]
        INLINE["inline 模式<br/>展开到当前对话"]
        FORK_MODE["fork 模式<br/>子代理独立运行"]
    end

    BUNDLED --> REG
    SKILL_DIR --> LOAD
    PLUGIN_SK --> PLUG
    MCP_SK --> MCP_LOAD
    DYNAMIC --> GET_CMD

    REG & LOAD & PLUG & MCP_LOAD --> GET_CMD
    GET_CMD --> GET_SKILL
    GET_SKILL --> SKILL_TOOL
    SKILL_TOOL --> INLINE
    SKILL_TOOL --> FORK_MODE
```

## 技能定义类型

```mermaid
classDiagram
    class BundledSkillDefinition {
        +name: string
        +description: string
        +aliases?: string[]
        +whenToUse?: string
        +argumentHint?: string
        +allowedTools?: string[]
        +model?: string
        +disableModelInvocation?: boolean
        +userInvocable?: boolean
        +isEnabled?(): boolean
        +hooks?: HooksSettings
        +context?: "inline" | "fork"
        +agent?: string
        +files?: Record~string, string~
        +getPromptForCommand(args, ctx): Promise~ContentBlockParam[]~
    }

    class PromptCommand {
        +type: "prompt"
        +name: string
        +description: string
        +source: SettingSource | "builtin" | "mcp" | "plugin" | "bundled"
        +loadedFrom: "skills" | "bundled" | "plugin" | "mcp" | "commands_DEPRECATED"
        +allowedTools?: string[]
        +model?: string
        +context?: "inline" | "fork"
        +getPromptForCommand(args, ctx): Promise~ContentBlockParam[]~
    }

    BundledSkillDefinition --> PromptCommand : 注册后转为
```

## 执行流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant REPL as REPL
    participant ST as SkillTool
    participant Skill as 技能定义
    participant QE as QueryEngine
    participant Agent as 子代理

    User->>REPL: /skill-name [args]
    REPL->>ST: executeUnsafe({skill, args})

    ST->>ST: getCommands(cwd) + MCP 技能
    ST->>ST: findCommand(skill-name)

    alt 找到技能
        ST->>Skill: getPromptForCommand(args, context)
        Skill-->>ST: ContentBlockParam[]

        alt context === "inline"
            ST-->>QE: 提示词展开到当前对话
            QE->>QE: 模型使用提示词 + allowedTools
        else context === "fork"
            ST->>Agent: 启动子代理
            Agent->>Agent: 独立上下文执行
            Agent-->>ST: 结果
        end
    else 未找到
        ST-->>User: 错误: 技能未找到
    end
```

## inline vs fork 执行上下文

```mermaid
graph LR
    subgraph inline["inline 模式"]
        I1["展开到当前对话"]
        I2["共享 Token 预算"]
        I3["实时用户交互"]
        I4["适合: 需引导的工作流"]
    end

    subgraph fork["fork 模式"]
        F1["子代理独立上下文"]
        F2["独立 Token 预算"]
        F3["后台异步运行"]
        F4["适合: 独立自含任务"]
    end

    SKILL["技能<br/>context 属性"] -->|"inline"| inline
    SKILL -->|"fork"| fork
```

## 14 个打包技能完整参考

```mermaid
graph TD
    subgraph 代码工作流["代码工作流"]
        BATCH["batch<br/>大规模并行变更<br/>5-30 个 worktree worker"]
        SIMPLIFY["simplify<br/>三并行审查: 重用/质量/效率"]
        VERIFY["verify<br/>验证代码变更 (Ant)"]
    end

    subgraph 调度与循环["调度与循环"]
        LOOP["loop<br/>定期执行 (cron)"]
        SCHEDULE["schedule<br/>远程代理调度"]
    end

    subgraph 知识与记忆["知识与记忆"]
        REMEMBER["remember<br/>审查自动记忆<br/>→ 晋升到 CLAUDE.md"]
        CLAUDE_API["claude-api<br/>API/SDK 文档参考<br/>247KB 内容"]
    end

    subgraph 开发辅助["开发辅助"]
        DEBUG["debug<br/>调试日志分析"]
        STUCK["stuck<br/>进程冻结诊断"]
        SKILLIFY["skillify<br/>4轮访谈→生成技能"]
    end

    subgraph 配置与UI["配置与 UI"]
        UPDATE_CFG["update-config<br/>settings.json 配置"]
        KEYBIND["keybindings-help<br/>快捷键自定义"]
    end

    subgraph 集成["外部集成"]
        CHROME["claude-in-chrome<br/>Chrome 浏览器自动化"]
        LOREM["lorem-ipsum<br/>占位文本生成"]
    end
```

### 每个技能详细参数

| 技能 | 别名 | 启用条件 | allowedTools | context | 模型调用 |
|------|------|---------|-------------|---------|---------|
| **batch** | - | `getIsGit()` | Agent, AskUser, EnterPlan, ExitPlan, Skill | fork | 模型可调用 |
| **simplify** | - | 始终 | (三个子代理各有工具) | inline | 模型可调用 |
| **verify** | - | `USER_TYPE=ant` | (由 SKILL_FILES 定义) | inline | 用户可调用 |
| **loop** | - | `isKairosCronEnabled()` | CronCreate, CronDelete | 组合 | 模型可调用 |
| **schedule** | - | `feature('AGENT_TRIGGERS_REMOTE')` | RemoteTrigger, AskUser | 组合 | 模型可调用 |
| **remember** | - | `isAutoMemoryEnabled()` | (纯文本) | inline | 用户可调用 |
| **claude-api** | - | `feature('BUILDING_CLAUDE_APPS')` | Read, Grep, Glob, WebFetch | inline | 模型可调用 |
| **debug** | - | 始终 | Read, Grep, Glob | inline | `disableModelInvocation` |
| **stuck** | - | 始终 | Bash | inline | 用户可调用 |
| **skillify** | - | 始终 | AskUserQuestion | inline | 模型可调用 |
| **update-config** | - | `feature('CONFIGURE_CLAUDE')` | Read | inline | 模型可调用 |
| **keybindings-help** | - | `isKeybindingCustomizationEnabled()` | Read | inline | 模型可调用 |
| **claude-in-chrome** | - | `shouldAutoEnableClaudeInChrome()` | mcp__claude-in-chrome__* | inline | 模型可调用 |
| **lorem-ipsum** | - | 始终 | (纯文本) | inline | 用户可调用 |

### batch 技能工作流

```mermaid
flowchart TD
    START["/batch [描述]"] --> PLAN["Phase 1: 进入规划模式"]
    PLAN --> RESEARCH["研究代码库<br/>识别变更范围"]
    RESEARCH --> DECOMPOSE["分解为 5-30 个<br/>独立工作单元"]
    DECOMPOSE --> ASK["询问用户:<br/>e2e 测试方法 + 批准"]
    ASK --> SPAWN["Phase 2: 启动并行 Worker"]

    SPAWN --> W1["Worker #1<br/>isolation: worktree"]
    SPAWN --> W2["Worker #2<br/>isolation: worktree"]
    SPAWN --> WN["Worker #N<br/>isolation: worktree"]

    W1 & W2 & WN --> TRACK["Phase 3: 追踪进度"]
    TRACK --> PR["合并 PR & 部署"]
```

### simplify 技能三代理审查

```mermaid
flowchart LR
    DIFF["git diff"] --> PARALLEL["并行启动 3 个代理"]

    PARALLEL --> A1["代理 1: 代码重用<br/>查找现有工具可替换新代码"]
    PARALLEL --> A2["代理 2: 代码质量<br/>冗余状态/参数蔓延/<br/>复制粘贴/泄露抽象"]
    PARALLEL --> A3["代理 3: 效率<br/>不必要工作/错过并发/<br/>热路径膨胀/内存泄漏"]

    A1 & A2 & A3 --> MERGE["合并发现"] --> FIX["修复问题"]
```

## 技能目录加载

```mermaid
flowchart TD
    LOAD["loadSkillsDir(cwd)"]

    LOAD --> SCAN["扫描三个位置"]
    SCAN --> USER_DIR["~/.claude/skills/*.md"]
    SCAN --> PROJECT_DIR[".claude/skills/*.md"]
    SCAN --> LOCAL_DIR[".claude/skills/*.md (local)"]

    USER_DIR & PROJECT_DIR & LOCAL_DIR --> DEDUP["realpath() 去重"]
    DEDUP --> PARSE["解析每个文件"]

    PARSE --> FM["提取 YAML frontmatter"]
    FM --> NAME["name (必需)"]
    FM --> DESC["description"]
    FM --> WHEN["whenToUse"]
    FM --> TOOLS["allowedTools"]
    FM --> CTX["context: inline|fork"]

    PARSE --> BODY["Markdown 正文<br/>= 提示词模板"]

    FM & BODY --> CMD["创建 PromptCommand"]
    CMD --> REGISTER["注册到命令系统"]
```

## 文件提取安全机制

```mermaid
flowchart TD
    FILES["技能定义 files 属性"] --> EXTRACT["提取到<br/>~/.claude/bundled-skills/{name}/"]

    EXTRACT --> SECURITY["安全检查"]
    SECURITY --> S1["路径遍历检测<br/>禁止 ../ 和绝对路径"]
    SECURITY --> S2["权限: 0o700(目录) 0o600(文件)"]
    SECURITY --> S3["O_NOFOLLOW 防符号链接"]
    SECURITY --> S4["O_EXCL 防竞态"]
    SECURITY --> S5["Promise 记忆化<br/>防并发写入"]

    EXTRACT --> PREFIX["前置目录提示:<br/>Base directory for this skill: {dir}"]
```
