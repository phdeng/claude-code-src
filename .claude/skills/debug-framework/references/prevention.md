# 问题预防指南

## 目录

1. [代码审查检查点](#代码审查检查点)
2. [常见陷阱规避](#常见陷阱规避)
3. [监控告警配置](#监控告警配置)
4. [日志最佳实践](#日志最佳实践)

## 代码审查检查点

### 安全检查

- [ ] 输入验证是否充分？
- [ ] SQL 是否使用参数化查询？
- [ ] 敏感数据是否加密存储？
- [ ] API 是否有权限控制？
- [ ] 密钥是否硬编码？

### 健壮性检查

- [ ] 空值/空集合是否处理？
- [ ] 边界条件是否考虑？
- [ ] 异常是否正确捕获和处理？
- [ ] 超时是否设置？
- [ ] 重试是否有退避策略？

### 可维护性检查

- [ ] 代码是否易于理解？
- [ ] 函数是否单一职责？
- [ ] 是否有必要的注释？
- [ ] 命名是否清晰？
- [ ] 是否有测试覆盖？

### 性能检查

- [ ] 是否有 N+1 查询？
- [ ] 大数据量是否分页？
- [ ] 是否有不必要的循环？
- [ ] 缓存策略是否合理？
- [ ] 资源是否正确释放？

## 常见陷阱规避

### 空值陷阱

```python
# ❌ 危险
data = api_response.get("result")
value = data["key"]  # 如果 result 是 None

# ✅ 安全
data = api_response.get("result") or {}
value = data.get("key", default_value)
```

### 并发陷阱

```python
# ❌ 竞态条件
if not cache.exists(key):
    value = expensive_compute()
    cache.set(key, value)

# ✅ 使用锁或原子操作
with lock:
    if not cache.exists(key):
        value = expensive_compute()
        cache.set(key, value)
```

### 资源泄漏

```python
# ❌ 可能泄漏
conn = db.connect()
result = conn.query(sql)
return result  # 异常时连接不会关闭

# ✅ 使用上下文管理
with db.connect() as conn:
    return conn.query(sql)
```

### 时区陷阱

```python
# ❌ 时区不明确
now = datetime.now()

# ✅ 使用 UTC
now = datetime.now(timezone.utc)
```

### 浮点精度

```python
# ❌ 精度问题
0.1 + 0.2 == 0.3  # False

# ✅ 使用 Decimal
from decimal import Decimal
Decimal("0.1") + Decimal("0.2") == Decimal("0.3")  # True
```

### 字符编码

```python
# ❌ 假设编码
text = data.decode()

# ✅ 明确编码
text = data.decode("utf-8")
```

## 监控告警配置

### 关键指标

| 指标类型 | 监控项 | 告警阈值示例 |
|---------|-------|------------|
| 可用性 | 服务存活 | 连续 3 次健康检查失败 |
| 延迟 | 响应时间 | P99 > 2s |
| 错误率 | 5xx 比例 | > 1% |
| 饱和度 | CPU 使用 | > 80% 持续 5 分钟 |
| 饱和度 | 内存使用 | > 85% |
| 饱和度 | 磁盘使用 | > 90% |

### 告警分级

| 级别 | 响应时间 | 通知方式 | 示例 |
|-----|---------|---------|------|
| P0 | 立即 | 电话 + 短信 | 服务不可用 |
| P1 | 15分钟 | 短信 + IM | 错误率飙升 |
| P2 | 1小时 | IM | 性能下降 |
| P3 | 工作日 | 邮件 | 磁盘空间预警 |

### 告警配置原则

1. **明确可行动性**：告警必须有明确的处理步骤
2. **避免告警疲劳**：合理设置阈值，减少误报
3. **分级处理**：区分紧急程度
4. **根因告警**：优先监控根因而非症状

## 日志最佳实践

### 日志格式

```json
{
  "timestamp": "ISO8601格式",
  "level": "INFO|WARN|ERROR",
  "service": "服务名",
  "trace_id": "请求追踪ID",
  "span_id": "当前操作ID",
  "message": "描述信息",
  "context": {
    "user_id": "用户标识",
    "request_id": "请求ID"
  },
  "error": {
    "type": "异常类型",
    "message": "异常信息",
    "stack": "堆栈信息"
  }
}
```

### 记录原则

**应该记录**：
- 请求入口和出口
- 重要业务事件
- 异常和错误
- 外部调用（数据库、API）
- 关键分支决策

**不应记录**：
- 敏感信息（密码、密钥、身份证）
- 循环内的重复日志
- 过于详细的调试信息（生产环境）
- 大量二进制数据

### 上下文传递

```python
# 使用 trace_id 串联请求链路
import uuid
from contextvars import ContextVar

trace_id: ContextVar[str] = ContextVar("trace_id")

def set_trace_id():
    trace_id.set(str(uuid.uuid4()))

def log(message, **kwargs):
    print({
        "trace_id": trace_id.get(),
        "message": message,
        **kwargs
    })
```

### 日志采样

高流量场景下的采样策略：

```python
import random

def should_log(sample_rate=0.1):
    return random.random() < sample_rate

# 错误必须记录，成功可采样
if error:
    log_error(error)
elif should_log(0.01):  # 1% 采样
    log_success(result)
```
