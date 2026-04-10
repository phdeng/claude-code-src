# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是 **Claude Code** 的源代码 — Anthropic 官方的 AI 编程 CLI 工具。本仓库仅包含 `src/` 目录（无 package.json / 构建脚本）。技术栈为 **TypeScript + React (Ink) + Bun**，使用 Ink 框架实现终端 UI。

## 架构总览

```
入口层 (entrypoints/, main.tsx)
    ↓
UI 层 (screens/, components/, ink/)  ← React + Ink 终端渲染
    ↓
查询引擎 (QueryEngine.ts, query.ts)  ← 对话生命周期管理
    ↓
工具系统 (Tool.ts, tools.ts, tools/)  ← 43+ 内置工具
    ↓
服务层 (services/)                    ← API 调用、MCP、分析等
    ↓
工具库 (utils/, hooks/, constants/)   ← 通用设施
```

## 核心模块

### 入口点 (`src/entrypoints/`, `src/main.tsx`)
- **main.tsx** (4600+ 行): 启动引导，含快速路径（`--version`、`--dump-system-prompt`）和多种模式检测（Bridge/Daemon/MCP/标准 CLI）
- **cli.tsx**: CLI 参数解析和交互入口
- **mcp.ts**: MCP 服务器启动入口
- **agentSdkTypes.ts**: Agent SDK 公开类型定义

### 查询引擎 (`src/QueryEngine.ts`, `src/query.ts`)
- **QueryEngine**: 核心类，管理完整对话生命周期。`submitMessage()` 返回 `AsyncGenerator<SDKMessage>`，实现流式响应
- **query.ts**: REPL UI 层对话处理，集成权限申请、工具执行反馈和 Ink 渲染

### 工具系统 (`src/Tool.ts`, `src/tools.ts`, `src/tools/`)
- `Tool.ts`: 工具类型定义（`name`, `description`, `getInputSchema()`, `validateInput()`, `executeUnsafe()`）
- `tools.ts`: 工具注册表。`getAllBaseTools()` 是所有工具的唯一来源。`getTools()` 按权限/模式过滤。`assembleToolPool()` 合并内置与 MCP 工具
- 每个工具一个目录：`src/tools/BashTool/`, `src/tools/FileReadTool/` 等

### 命令系统 (`src/commands.ts`, `src/commands/`)
- `commands.ts`: 命令注册表，50+ 斜杠命令
- `getCommands(cwd)` 聚合内置命令、插件命令、技能和工作流
- 命令类型：`local`（本地执行）、`local-jsx`（Ink UI）、`prompt`（发送给模型）

### 服务层 (`src/services/`)
- **api/claude.ts** (125KB): Claude API 调用核心，重试和错误处理
- **mcp/**: MCP 客户端完整实现（连接、OAuth、工具/资源代理）
- **compact/**: 对话历史压缩策略
- **analytics/**: 事件日志、GrowthBook 特性开关
- **lsp/**: 语言服务器协议集成
- **tools/toolOrchestration.ts**: 工具执行编排

### 全局状态 (`src/bootstrap/state.ts`)
单一 `State` 类型管理全局状态（`cwd`、`projectRoot`、`modelUsage`、`sessionId` 等 80+ 字段）。贯穿整个应用生命周期，支持会话恢复。顶部注释明确要求 **不要随意增加全局状态**。

### 权限系统 (`src/utils/permissions/`, `src/hooks/useCanUseTool.ts`)
三种模式：`auto` | `manual` | `bypass`。工具执行前经权限检查，拒绝记录防止死循环。

## 关键设计模式

### 特性标志（编译时死代码消除）
```typescript
import { feature } from 'bun:bundle'
if (feature('KAIROS')) { /* 仅在特定构建变体中编译 */ }
```
常见标志：`KAIROS`（助手模式）、`BRIDGE_MODE`、`COORDINATOR_MODE`、`PROACTIVE`、`VOICE_MODE`、`AGENT_TRIGGERS`

### 条件工具/命令加载
内部工具（`USER_TYPE === 'ant'`）和特性门控工具通过 `require()` 懒加载，实现死代码消除：
```typescript
const REPLTool = process.env.USER_TYPE === 'ant'
  ? require('./tools/REPLTool/REPLTool.js').REPLTool : null
```

### 循环依赖处理
部分模块通过懒 `require()` 打破循环依赖（如 `TeamCreateTool`、`TeamDeleteTool`）。`src/utils/crypto.ts` 是隔离的纯叶子模块，用于避免 bootstrap 阶段的循环依赖。

### 导入约定
- 使用 `src/` 路径别名
- `.js` 扩展名用于 ESM 兼容
- `biome-ignore-all assist/source/organizeImports` 注释保护特殊导入顺序（ANT-ONLY 标记不可重排）

## 目录结构要点

| 目录 | 用途 |
|------|------|
| `src/screens/` | 主要 UI 屏幕（REPL、Doctor 等） |
| `src/ink/` | Ink 框架自定义组件和渲染引擎 |
| `src/components/` | 113+ React 组件 |
| `src/hooks/` | 96+ React Hook（权限、输入、滚动等） |
| `src/skills/` | 技能系统（内置 + 目录加载） |
| `src/plugins/` | 插件系统 |
| `src/coordinator/` | 多智能体协调模式 |
| `src/state/` | 应用状态管理 |
| `src/schemas/` | 数据验证 schema |
| `src/migrations/` | 数据迁移 |
| `src/remote/` | 远程会话支持 |
| `src/voice/` | 语音输入集成 |
| `src/vim/` | Vim 模式支持 |
| `src/keybindings/` | 快捷键系统 |
