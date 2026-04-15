# 故障排查指南

## 常见问题

### 1. 服务启动失败

**症状**: 执行 `msp-xxx.bat start` 后服务未启动

**排查步骤**:

```powershell
# 1. 检查 Java 环境
java -version
# 期望: openjdk version "17.x.x" 或更高

# 2. 检查 Maven
mvn -v
# 期望: Apache Maven 3.6+

# 3. 检查端口是否被占用
netstat -ano | findstr ":端口号"

# 4. 查看服务日志
# 日志位置通常在项目目录下的 logs/ 或控制台输出
```

### 2. Nacos 注册失败

**症状**: 服务启动但 `check-nacos-services.bat` 显示未注册

**排查步骤**:

```powershell
# 1. 确认 Nacos 运行
curl http://localhost:8848/nacos

# 2. 检查 Nacos 控制台
# 浏览器访问: http://localhost:8848/nacos
# 用户名: nacos
# 密码: nacos

# 3. 检查服务配置
# 确认 application.yml 中的 nacos 配置正确
```

### 3. 端口冲突

**症状**: Address already in use

**解决方法**:

```powershell
# 查找占用端口的进程
netstat -ano | findstr ":8848"

# 输出示例: TCP 0.0.0.0:8848 0.0.0.0:0 LISTENING 12345
# 最后的数字(12345)是 PID

# 终止进程
taskkill /PID 12345 /F

# 或者通过进程名终止
taskkill /IM java.exe /F  # 注意：会终止所有 Java 进程
```

### 4. 前端启动失败

**症状**: npm run dev 报错

**排查步骤**:

```powershell
# 1. 检查 Node 版本
node -v
# 期望: v18.x 或更高

# 2. 清理并重新安装依赖
rm -rf node_modules
rm package-lock.json
npm install

# 3. 检查端口占用
netstat -ano | findstr ":5173"
```

### 5. Gateway 路由失败

**症状**: 访问 API 返回 404 或 503

**排查步骤**:

```powershell
# 1. 确认所有服务已注册到 Nacos
cd $PROJECT_ROOT\run
.\check-nacos-services.bat

# 2. 重启 Gateway（确保其他服务都已启动）
.\msp-gateway.bat restart

# 3. 检查 Gateway 健康状态
curl http://localhost:9999/actuator/health
```

## 快速恢复流程

### 完全重启

```powershell
cd $PROJECT_ROOT\run

# 1. 停止所有服务
.\msp-all.bat stop

# 2. 等待几秒确保端口释放
Start-Sleep -Seconds 5

# 3. 启动所有服务
.\msp-all.bat start

# 4. 验证服务状态
.\check-nacos-services.bat
```

### 单服务重启

```powershell
cd $PROJECT_ROOT\run

# 重启特定服务
.\msp-operations-server.bat restart

# 等待重启完成
.\msp-operations-server.bat wait

# 确认注册状态
.\check-nacos-services.bat
```

## 日志位置

| 服务 | 日志位置 |
|------|---------|
| 后端服务 | 控制台输出 / `target/logs/` |
| Nacos | `msp-platform/msp-register/data/logs/` |
| 前端 | 浏览器开发者工具 Console |
