# 调试工具箱

## 目录

1. [通用调试工具](#通用调试工具)
2. [语言专属工具](#语言专属工具)
3. [日志分析](#日志分析)
4. [性能分析](#性能分析)
5. [网络调试](#网络调试)

## 通用调试工具

### 日志工具

```bash
# 实时查看日志
tail -f app.log

# 过滤关键字
grep -i "error\|warn\|exception" app.log

# 带上下文的搜索
grep -B5 -A10 "ERROR" app.log

# 统计错误频率
grep -c "ERROR" app.log

# 按时间筛选（需日志有时间戳）
awk '/2024-01-15 10:/ && /ERROR/' app.log
```

### Git 调试

```bash
# 查找引入 bug 的提交
git bisect start
git bisect bad HEAD
git bisect good <已知正常的commit>
# 重复测试并标记 good/bad

# 查看文件变更历史
git log -p -- path/to/file.py

# 查看某行代码是谁写的
git blame path/to/file.py

# 搜索代码变更
git log -S "function_name" --oneline
```

### 系统资源

```bash
# CPU 使用
top -bn1 | head -20
htop

# 内存使用
free -h
vmstat 1 5

# 磁盘空间
df -h
du -sh /path/*

# 进程状态
ps aux | grep process_name
lsof -p <pid>
```

## 语言专属工具

### Python

```python
# 内置调试器
import pdb; pdb.set_trace()  # Python 3.6-
breakpoint()  # Python 3.7+

# 打印变量信息
print(f"{variable=}")  # Python 3.8+

# 查看对象
dir(obj)
vars(obj)
type(obj)

# 调用栈
import traceback
traceback.print_stack()
```

**工具推荐**：
- `ipdb`: 增强版 pdb
- `pudb`: TUI 调试界面
- `py-spy`: 性能分析
- `memory_profiler`: 内存分析

### JavaScript/Node.js

```javascript
// 浏览器调试
debugger;
console.log({variable});
console.table(array);
console.trace();

// Node.js 调试
node --inspect app.js
node --inspect-brk app.js  // 启动时暂停
```

**工具推荐**：
- Chrome DevTools
- `ndb`: 增强版 Node 调试器
- `clinic.js`: 性能诊断

### Java

```java
// 远程调试
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 -jar app.jar

// 堆栈打印
Thread.dumpStack();
new Exception().printStackTrace();
```

**工具推荐**：
- JDB (命令行)
- VisualVM (GUI)
- JProfiler (商业)
- Arthas (在线诊断)

### Go

```go
// 内置调试
import "runtime/debug"
debug.PrintStack()

// 使用 delve
// dlv debug main.go
// dlv attach <pid>
```

**工具推荐**：
- `delve`: Go 调试器
- `pprof`: 性能分析
- `trace`: 执行追踪

## 日志分析

### 日志级别使用

| 级别 | 用途 | 示例 |
|-----|------|------|
| DEBUG | 开发调试详情 | 变量值、流程追踪 |
| INFO | 正常业务事件 | 用户登录、订单创建 |
| WARN | 潜在问题 | 重试成功、降级处理 |
| ERROR | 错误但可恢复 | API 调用失败 |
| FATAL | 严重错误 | 服务无法启动 |

### 结构化日志

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "ERROR",
  "service": "order-service",
  "trace_id": "abc123",
  "message": "Failed to process order",
  "error": "connection timeout",
  "order_id": "12345",
  "user_id": "user_001"
}
```

### 日志分析命令

```bash
# JSON 日志解析 (需要 jq)
cat app.log | jq 'select(.level == "ERROR")'
cat app.log | jq 'select(.trace_id == "abc123")'

# 统计每分钟错误数
grep "ERROR" app.log | cut -d' ' -f1-2 | uniq -c

# 提取特定字段
grep "order_id" app.log | sed 's/.*order_id":"\([^"]*\).*/\1/' | sort | uniq -c
```

## 性能分析

### CPU 分析

```bash
# Linux perf
perf record -g ./app
perf report

# 火焰图
perf record -F 99 -g ./app
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg
```

### 内存分析

```bash
# 查看进程内存
pmap -x <pid>
cat /proc/<pid>/smaps

# Valgrind 内存检查
valgrind --leak-check=full ./app
```

### 数据库分析

```sql
-- MySQL 慢查询
SHOW VARIABLES LIKE 'slow_query%';
SET GLOBAL slow_query_log = 'ON';

-- 分析执行计划
EXPLAIN ANALYZE SELECT ...;

-- 查看当前查询
SHOW PROCESSLIST;
```

## 网络调试

### 连接测试

```bash
# 端口连通性
telnet host port
nc -zv host port

# DNS 解析
nslookup domain
dig domain

# 路由追踪
traceroute host
mtr host
```

### 抓包分析

```bash
# tcpdump
tcpdump -i eth0 port 80 -w capture.pcap
tcpdump -i any host 192.168.1.1

# 查看 HTTP 请求
tcpdump -A -s0 port 80 | grep -E "GET|POST|HTTP"
```

### HTTP 调试

```bash
# curl 详细输出
curl -v https://api.example.com/endpoint

# 带请求头
curl -H "Authorization: Bearer token" https://api.example.com

# 查看响应时间
curl -o /dev/null -s -w "time_total: %{time_total}\n" https://api.example.com
```

### 常用 HTTP 状态码

| 状态码 | 含义 | 常见原因 |
|-------|------|---------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 认证失败/过期 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 路由错误/资源不存在 |
| 500 | Internal Error | 服务端异常 |
| 502 | Bad Gateway | 上游服务不可用 |
| 503 | Unavailable | 服务过载/维护 |
| 504 | Timeout | 上游服务超时 |
