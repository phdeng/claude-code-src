---
name: devops
description: MSP 服务运维与测试技能。用于启动/停止/重启后端微服务、启动前端开发服务器、检查服务状态。当用户说"启动后端服务"、"启动前端"、"stop backend"、"restart services"、"服务状态"、"check services"、"运行项目"、"start project"时触发。Agent 执行测试前也可使用此技能启动必要服务。
---

# DevOps 服务运维技能

MSP 微服务平台的运维管理技能，集成 `run/` 目录下的服务启动脚本。

## 适用场景

- 用户说"启动后端服务"、"启动后端"、"start backend"
- 用户说"启动前端"、"启动前端服务"、"start frontend"
- 用户说"停止服务"、"stop services"
- 用户说"重启服务"、"restart"
- 用户说"检查服务状态"、"check services"、"服务健康检查"
- Agent 执行 E2E 测试前需要启动服务
- Agent 执行 API 测试前需要确认后端服务运行

## 服务架构

```
MSP 微服务依赖关系:
  1. msp-register (8848)        - Nacos 注册中心，无依赖
  2. msp-auth (3000)            - 认证服务，等待 register
  3. msp-upms (4000)            - 用户权限服务，等待 auth
  4. msp-operations-server (6060) - 运营模块，等待 upms
  5. msp-supplier-server (6061)   - 供应商模块，等待 upms
  6. msp-gateway (9999)         - API 网关，等待全部服务
```

## Claude Code 调用规范（Windows）

由于 Claude Code 在 Windows 下使用 Git Bash 作为默认 Shell，直接执行 `.bat` 脚本会失败。**必须通过 PowerShell 调用**：

```bash
# $PROJECT_ROOT 为当前项目根目录（Claude Code 工作目录）
powershell.exe -Command "Set-Location '$PROJECT_ROOT\run'; & .\msp-all.bat start"
```

## 后端服务管理

### 启动全部后端服务

当用户说"启动后端服务"、"启动所有服务"、"start all services"时：

```bash
# Claude Code 调用方式
powershell.exe -Command "Set-Location '$PROJECT_ROOT\run'; & .\msp-all.bat start"
```

用户手动在 PowerShell 终端执行：
```powershell
cd $PROJECT_ROOT\run
.\msp-all.bat start
```

脚本会自动：
1. 按依赖顺序启动服务
2. 等待每个服务就绪后再启动下一个
3. 最后检查 Nacos 注册状态

### 停止全部后端服务

当用户说"停止服务"、"stop backend"、"关闭服务"时：

```powershell
cd $PROJECT_ROOT\run
.\msp-all.bat stop
```

### 检查服务状态

当用户说"检查服务"、"服务状态"、"check services"时：

```powershell
cd $PROJECT_ROOT\run
.\check-nacos-services.bat
```

或直接查看状态：

```powershell
cd $PROJECT_ROOT\run
.\msp-all.bat status
```

### 单个服务操作

支持单个服务的 start/stop/restart/status/wait 命令：

| 服务 | 脚本 | 端口 |
|-----|------|------|
| 注册中心 | `msp-register.bat` | 8848 |
| 认证服务 | `msp-auth.bat` | 3000 |
| 用户权限 | `msp-upms.bat` | 4000 |
| 运营模块 | `msp-operations-server.bat` | 6060 |
| 供应商模块 | `msp-supplier-server.bat` | 6061 |
| API网关 | `msp-gateway.bat` | 9999 |

示例：

```powershell
# 重启运营模块
cd $PROJECT_ROOT\run
.\msp-operations-server.bat restart

# 检查认证服务状态
.\msp-auth.bat status

# 等待网关就绪
.\msp-gateway.bat wait
```

## 前端服务管理

### 启动运营模块前端

当用户说"启动运营前端"、"start operations ui"时：

```powershell
cd $PROJECT_ROOT\msp-operations-ui
npm run dev
```

### 启动供应商模块前端

当用户说"启动供应商前端"、"start supplier ui"时：

```powershell
cd $PROJECT_ROOT\msp-supplier-ui
npm run dev
```

### 前端构建

```powershell
# 运营模块构建
cd $PROJECT_ROOT\msp-operations-ui
npm run build

# 供应商模块构建
cd $PROJECT_ROOT\msp-supplier-ui
npm run build
```

## 快速操作指南

### 完整启动（后端 + 前端）

```powershell
# 1. 启动全部后端服务（新终端窗口）
cd $PROJECT_ROOT\run
.\msp-all.bat start

# 2. 等待服务注册完成后，启动前端（另一个终端）
cd $PROJECT_ROOT\msp-operations-ui
npm run dev
```

### 健康检查流程

```powershell
# 1. 检查端口占用
netstat -ano | findstr "8848 3000 4000 6060 9999"

# 2. 检查 Nacos 注册
cd $PROJECT_ROOT\run
.\check-nacos-services.bat

# 3. 验证网关可访问
curl http://localhost:9999/actuator/health
```

### Agent 测试前置检查

在执行 E2E 测试或 API 测试前，Agent 应该：

1. **检查服务状态**
   ```powershell
   cd $PROJECT_ROOT\run
   .\msp-all.bat status
   ```

2. **如果服务未运行，启动服务**
   ```powershell
   .\msp-all.bat start
   # 等待 Nacos 注册完成（脚本会自动等待）
   ```

3. **确认网关可访问**
   ```powershell
   curl -s -o /dev/null -w "%{http_code}" http://localhost:9999/actuator/health
   # 期望返回 200
   ```

## 常见问题处理

### 端口被占用

```powershell
# 查找占用端口的进程
netstat -ano | findstr ":8848"
# 终止进程
taskkill /PID <PID> /F
```

### 服务启动超时

1. 检查 Java 环境：`java -version`
2. 检查 Maven 配置：`mvn -v`
3. 检查网络连接（Nacos）

### 服务注册失败

1. 确保 msp-register 先启动并就绪
2. 检查 Nacos 控制台：http://localhost:8848/nacos
3. 查看服务日志

## 可用脚本清单

| 脚本 | 功能 | 命令 |
|-----|------|------|
| `msp-all.bat` | 全部服务管理 | start, stop, status |
| `msp-register.bat` | 注册中心 | start, stop, restart, status, wait |
| `msp-auth.bat` | 认证服务 | start, stop, restart, status, wait |
| `msp-upms.bat` | 用户权限服务 | start, stop, restart, status, wait, install |
| `msp-operations-server.bat` | 运营模块 | start, stop, restart, status, wait |
| `msp-supplier-server.bat` | 供应商模块 | start, stop, restart, status, wait |
| `msp-gateway.bat` | API 网关 | start, stop, restart, status, wait |
| `check-nacos-services.bat` | Nacos 服务检查 | - |
| `check-nacos-services.ps1` | Nacos 服务检查(PS) | - |

## 关键规则

### 必须遵守
- 后端服务启动后，**必须等待 Nacos 注册完成**再进行下一步
- 单个服务重启后，执行 `check-nacos-services.bat` 确认注册成功
- Gateway 必须最后启动，否则路由注册不完整

### 推荐做法
- 使用 `msp-all.bat start` 一键启动，脚本会自动处理依赖顺序
- 修改代码后优先使用单个服务 restart，而非重启全部
- 测试前先执行状态检查，确认服务可用
