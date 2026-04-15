# MSP 服务端口参考

## 后端服务端口

| 服务名称 | 端口 | Nacos 服务名 | 说明 |
|---------|------|-------------|------|
| msp-register | 8848 | - | Nacos 注册中心 |
| msp-auth | 3000 | msp-auth | OAuth2 认证服务 |
| msp-upms | 4000 | msp-upms-biz | 用户权限管理 |
| msp-operations-server | 6060 | msp-operations-server-biz | 运营模块后端 |
| msp-supplier-server | 6061 | msp-supplier-server-biz | 供应商模块后端 |
| msp-gateway | 9999 | msp-gateway | API 网关 |

## 前端开发端口

| 项目 | 默认端口 | 说明 |
|------|---------|------|
| msp-operations-ui | 5173 | 运营模块前端 (Vite) |
| msp-supplier-ui | 5174 | 供应商模块前端 (Vite) |

## API 访问路径

通过 Gateway 访问后端 API：

| 模块 | 路径前缀 |
|------|---------|
| 运营模块 | `http://localhost:9999/operations/**` |
| 供应商模块 | `http://localhost:9999/supplier/**` |
| 用户权限 | `http://localhost:9999/admin/**` |
| 认证 | `http://localhost:9999/auth/**` |

## 健康检查端点

| 服务 | 健康检查 URL |
|------|-------------|
| Gateway | `http://localhost:9999/actuator/health` |
| Nacos | `http://localhost:8848/nacos/#/serviceManagement` |

## 端口检查命令

```powershell
# Windows PowerShell - 检查特定端口
netstat -ano | findstr ":8848"
netstat -ano | findstr ":9999"

# 检查所有 MSP 相关端口
netstat -ano | findstr "8848 3000 4000 6060 6061 9999"

# 检查进程详情
Get-Process -Id (Get-NetTCPConnection -LocalPort 8848).OwningProcess
```
