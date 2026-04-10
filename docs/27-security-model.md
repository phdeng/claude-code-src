# 27 - 安全模型全景

> 从源码提取的完整安全防护体系：路径验证 7 层、Bash 检查 23 项、Unicode 净化、权限追踪。

---

## 纵深防御总览

```mermaid
graph TD
    INPUT["用户/模型输入"] --> L1["Layer 1: Cyber Risk 指令<br/>(系统提示级)"]
    L1 --> L2["Layer 2: 权限规则<br/>(deny/allow/ask)"]
    L2 --> L3["Layer 3: Auto Mode 分类器<br/>(AI 语义分析)"]
    L3 --> L4["Layer 4: 路径验证 7 层<br/>(filesystem.ts)"]
    L4 --> L5["Layer 5: Bash 安全检查 23 项<br/>(bashSecurity.ts)"]
    L5 --> L6["Layer 6: Unicode 净化<br/>(sanitization.ts)"]
    L6 --> L7["Layer 7: 否决追踪<br/>(denialTracking.ts)"]
    L7 --> EXEC["执行"]

    style L1 fill:#fee
    style L2 fill:#fed
    style L3 fill:#fec
    style L4 fill:#feb
    style L5 fill:#fea
    style L6 fill:#fe9
    style L7 fill:#fe8
```

---

## 1. 路径验证 7 层模型

**文件**: `src/utils/permissions/pathValidation.ts`

```mermaid
flowchart TD
    PATH["文件路径输入"] --> L1{"Layer 1<br/>拒绝规则优先"}
    L1 -->|匹配 deny| DENY["拒绝"]
    L1 -->|否| L2{"Layer 2<br/>内部可编辑路径?<br/>(计划/临时文件)"}
    L2 -->|是| ALLOW["允许"]
    L2 -->|否| L3{"Layer 3<br/>安全性检查"}

    L3 --> S1["Windows 模式检查<br/>(UNC → NTLM 泄露防护)"]
    L3 --> S2["配置文件检查<br/>(.gitconfig, .bashrc 等)"]
    L3 --> S3["危险文件检查<br/>(.git/, .claude/ 等)"]
    L3 --> S4["Tilde 变量检查<br/>(~user, ~+, ~-)"]
    L3 --> S5["Shell 展开检查<br/>($VAR, ${VAR}, %VAR%)"]
    L3 --> S6["Glob 通配符检查<br/>(写操作禁止 *)"]

    L3 -->|危险| ASK["询问用户"]
    L3 -->|安全| L4{"Layer 4<br/>工作目录检查"}
    L4 -->|在 cwd 内| L5{"Layer 5<br/>内部可读路径?"}
    L4 -->|cwd 外| ASK

    L5 -->|是| ALLOW
    L5 -->|否| L6{"Layer 6<br/>沙箱白名单?"}
    L6 -->|是| ALLOW
    L6 -->|否| L7{"Layer 7<br/>允许规则匹配?"}
    L7 -->|是| ALLOW
    L7 -->|否| ASK

    style DENY fill:#fdd
    style ALLOW fill:#dfd
    style ASK fill:#ffd
```

### 受保护文件 (8 个)

```
.gitconfig, .gitmodules, .bashrc, .bash_profile,
.zshrc, .zprofile, .profile, .ripgreprc
```

### 受保护目录 (4 个)

```
.git/, .vscode/, .idea/, .claude/
```

---

## 2. Bash 命令安全检查 (23 项)

**文件**: `src/tools/BashTool/bashSecurity.ts`

```mermaid
graph TD
    BASH["Bash 命令"] --> CHECKS["23 项安全检查"]

    CHECKS --> G1["命令完整性"]
    G1 --> C1["不完整命令检测"]
    G1 --> C2["引号不匹配"]
    G1 --> C3["控制字符检测"]
    G1 --> C4["Unicode 空格检测"]

    CHECKS --> G2["注入防护"]
    G2 --> C5["命令替换 $() `` "]
    G2 --> C6["进程替换 <() >()"]
    G2 --> C7["参数展开危险"]
    G2 --> C8["IFS 注入"]
    G2 --> C9["jq 系统函数滥用"]

    CHECKS --> G3["信息泄露"]
    G3 --> C10["/proc/*/environ 访问"]
    G3 --> C11["中间单词 # 碰撞"]

    CHECKS --> G4["Zsh 特定"]
    G4 --> C12["zmodload (模块加载)"]
    G4 --> C13["emulate -c (eval 等价)"]
    G4 --> C14["zpty (伪终端执行)"]
    G4 --> C15["ztcp/zsocket (网络外泄)"]
    G4 --> C16["sysopen/sysread/syswrite"]
    G4 --> C17["zf_rm/zf_mv/zf_ln"]
```

### 危险删除操作阻止

```mermaid
flowchart TD
    RM["rm/删除操作"] --> CHECK{"目标路径?"}

    CHECK -->|"通配符 *"| BLOCK["阻止"]
    CHECK -->|"路径末尾 /*"| BLOCK
    CHECK -->|"根目录 /"| BLOCK
    CHECK -->|"家目录 ~"| BLOCK
    CHECK -->|"根目录子目录<br/>/usr, /tmp, /etc"| BLOCK
    CHECK -->|"Windows 驱动器根<br/>C:\, D:\"| BLOCK
    CHECK -->|"Windows 系统目录<br/>C:\Windows, C:\Users"| BLOCK
    CHECK -->|"其他"| ALLOW["允许 (需权限)"]

    style BLOCK fill:#fdd
```

---

## 3. Unicode 隐藏字符防护

**文件**: `src/utils/sanitization.ts`

```mermaid
flowchart TD
    INPUT["输入文本"] --> NFKC["NFKC 标准化"]
    NFKC --> REMOVE["移除隐藏字符"]

    REMOVE --> R1["\\p{Cf} 格式字符"]
    REMOVE --> R2["\\p{Co} 私有用途"]
    REMOVE --> R3["\\p{Cn} 未分配字符"]
    REMOVE --> R4["\\u200B-\\u200F 零宽空格"]
    REMOVE --> R5["\\u202A-\\u202E 方向性格式化"]
    REMOVE --> R6["\\uFEFF BOM"]
    REMOVE --> R7["\\uE000-\\uF8FF 私有使用区"]

    REMOVE --> ITERATE["最多 10 次迭代<br/>(防止无限循环)"]
    ITERATE --> STABLE{"输出稳定?"}
    STABLE -->|是| OUTPUT["净化后的文本"]
    STABLE -->|"10 次后仍不稳定"| FORCE["强制输出"]

    subgraph 防御目标["防御目标"]
        ATK1["ASCII Smuggling"]
        ATK2["隐藏提示注入"]
        ATK3["方向性文本伪装"]
    end
```

---

## 4. 权限否决追踪

**文件**: `src/utils/permissions/denialTracking.ts`

```mermaid
stateDiagram-v2
    [*] --> 正常

    正常 --> 连续+1 : 工具被拒绝
    连续+1 --> 正常 : 工具成功 (重置连续)
    
    连续+1 --> 连续阈值 : 连续 ≥ 3
    state 连续阈值 {
        [*] --> 提示回退
        note right of 提示回退 : 告知模型停止重试同类工具
    }

    正常 --> 总计+1 : 工具被拒绝 (累加)
    总计+1 --> 总计阈值 : 累计 ≥ 20
    state 总计阈值 {
        [*] --> 全局回退
        note right of 全局回退 : 强化工具使用限制
    }
```

---

## 5. Undercover 模式

**文件**: `src/utils/undercover.ts`

```mermaid
flowchart TD
    CHECK["启动检查"] --> ENV{"CLAUDE_CODE_UNDERCOVER=1?"}
    ENV -->|是| FORCE_ON["强制启用"]
    ENV -->|否| REPO{"仓库在内部允许列表?"}
    REPO -->|是| OFF["关闭 (安全)"]
    REPO -->|否| AUTO_ON["自动启用"]

    FORCE_ON & AUTO_ON --> PROTECT["保护措施"]
    PROTECT --> P1["系统提示注入<br/>## UNDERCOVER MODE"]
    PROTECT --> P2["提交消息净化<br/>移除内部代号"]
    PROTECT --> P3["PR 净化<br/>移除归属信息"]
    PROTECT --> P4["模型身份隐藏<br/>不告知模型型号"]
    PROTECT --> P5["归属删除<br/>移除 Co-Authored-By"]
```

---

## 6. 沙箱系统

**文件**: `src/utils/sandbox/sandbox-adapter.ts`

```mermaid
flowchart TD
    BASH_CALL["Bash 命令"] --> SANDBOX{"沙箱启用?"}

    SANDBOX -->|是| WRAP["SandboxManager 包装"]
    SANDBOX -->|否| DIRECT["直接执行"]

    WRAP --> FS_LIMIT["文件系统限制"]
    FS_LIMIT --> ALLOW_WRITE["allowWrite 路径白名单"]
    FS_LIMIT --> DENY_WRITE["denyWrite 路径黑名单"]

    WRAP --> NET_LIMIT["网络限制"]
    NET_LIMIT --> MANAGED["Managed Domains<br/>(组织策略控制)"]

    subgraph 路径解析["路径解析"]
        P1["//path → /path (绝对)"]
        P2["/path → $SETTINGS_DIR/path"]
        P3["~/path → 展开 home"]
        P4["./path → 相对路径"]
    end
```

---

## 7. 安全文件操作

### 符号链接防护

```mermaid
flowchart TD
    FILE_OP["文件操作"] --> RESOLVE["getPathsForPermissionCheck()"]
    RESOLVE --> REAL["realpath() 解析"]
    REAL --> SYMLINK{"符号链接?"}
    SYMLINK -->|是| BOTH["检查原始路径 + 目标路径"]
    SYMLINK -->|否| SINGLE["检查原始路径"]

    subgraph 打包技能["打包技能文件安全"]
        NOFOLLOW["O_NOFOLLOW 标志<br/>(阻止符号链接跟踪)"]
        EXCL["O_EXCL 标志<br/>(防止 TOCTOU 竞态)"]
        PERM_DIR["目录权限: 0o700"]
        PERM_FILE["文件权限: 0o600"]
    end
```

### 路径遍历检测

```
正则: /(?:^|[\\/])\.\.(?:[\\/]|$)/
↓
匹配: ../file, ..\file, path/../file
不匹配: ..filename, file..txt
```

---

## 8. 策略限制 (组织级)

**文件**: `src/services/policyLimits/types.ts`

```mermaid
flowchart TD
    ORG["组织管理员"] --> POLICY["设置策略限制"]
    POLICY --> TYPES["限制类型"]

    TYPES --> ALLOW_FEEDBACK["allow_product_feedback"]
    TYPES --> ALLOW_TELEMETRY["allow_telemetry"]
    TYPES --> CUSTOM["自定义策略..."]

    POLICY --> ENFORCE["执行策略"]
    ENFORCE --> CHECK["isPolicyAllowed(policy)"]

    CHECK --> HAS_DATA{"有缓存?"}
    HAS_DATA -->|是| VERIFY["检查 restrictions"]
    HAS_DATA -->|否| ESSENTIAL{"essential-traffic-only?"}

    ESSENTIAL -->|"+ DENY_ON_MISS 策略"| DENY["fail closed (拒绝)"]
    ESSENTIAL -->|否| OPEN["fail open (允许)"]
```

---

## 9. 敏感数据处理

```mermaid
flowchart TD
    subgraph 存储["安全存储"]
        KEYCHAIN["macOS Keychain<br/>(优先)"]
        PLAINTEXT["明文回退<br/>(非 macOS)"]
        TTL_CACHE["TTL 缓存<br/>(防频繁 spawn)"]
    end

    subgraph 传输["传输安全"]
        OAUTH["OAuth PKCE<br/>(Code Verifier + Challenge)"]
        FD["FD 传递 API 密钥<br/>(不经过命令行)"]
        INPROC["in-process OAuth<br/>(token 不到 shell)"]
    end

    subgraph 日志["日志安全"]
        PII["_PROTO_* 键<br/>→ 受限 PII 列"]
        STRIP["stripProtoFields()<br/>发送前移除"]
        DEHYDRATE["VCR 脱水<br/>移除敏感值"]
    end

    subgraph 插件["插件安全"]
        SENSITIVE_KEY["敏感配置变量<br/>→ [sensitive-key: X]<br/>(不替换真实值)"]
    end
```

---

## 安全设计原则

| 原则 | 实现 |
|------|------|
| **纵深防御** | 7 层路径验证 + 23 项 Bash 检查 |
| **故障安全** | 不确定时 ask，不自动 allow |
| **白名单优先** | 显式 allow 而非 deny |
| **尽早验证** | 路径处理前检测遍历/展开/特殊字符 |
| **符号链接感知** | realpath + O_NOFOLLOW + 双路径检查 |
| **跨平台** | Windows UNC/驱动器 + POSIX 统一处理 |
| **最小权限** | 文件 0o600, 目录 0o700 |
| **防重放** | 否决追踪 (连续 3 + 累计 20) |
