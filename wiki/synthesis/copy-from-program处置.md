---
type: synthesis
kind: incident
title: "COPY FROM PROGRAM 处置链路"
date: 2026-05-10
status: settled
domain: security
tags: [security, postgresql, incident-response]
sources: ["wiki/sources/安全运维复盘"]
entities: ["wiki/entities/postgresql"]
concepts: []
related: ["wiki/synthesis/claude-code-400修复"]
confidence: high
as_of: 2026-10-19
---

# COPY FROM PROGRAM 处置链路

## 问题

2026-04-10 收到两条告警，均为公网 PostgreSQL 容器被入侵。此页把完整处置链路归档为可复用的排查与加固流程。

## 我的结论

这次告警不是误报。攻击者通过暴露在公网的 `pgvector` PostgreSQL 容器端口进来，利用 PostgreSQL 超级用户可执行服务端程序的能力，发起 `COPY FROM PROGRAM`。该命令用 `base64` 编码隐藏真实脚本，解码后连接恶意下载源 `210.97.42.242:8088` 拉取后续脚本，最终在容器里落下 XMRig 挖矿。

**根因不是某个 CVE，是三个配置叠加**：端口对公网开放 + 超级用户弱口令 + 容器权限过高。

## 攻击链

```text
公网 → pgvector 容器 5432/54321
   ↓ 超级用户登录成功
COPY FROM PROGRAM 'echo <base64> | base64 -d | bash'
   ↓ 数据库进程成为命令执行入口
curl/wget 拉 210.97.42.242:8088
   ↓ 降级链：curl → wget → bash /dev/tcp 自实现 HTTP
落 XMRig，杀 kinsing / kdevtmpfsi（竞品挖矿）
   ↓
挖矿配置指向 pool.supportxmr.com:443
```

**恶意脚本的三级下载降级值得记**：`curl` → `wget` → `bash /dev/tcp` 手写 HTTP。这说明对方的脚本假定目标环境可能极度精简，防御方不能只靠「容器里没装 curl」来判断安全。

## 处置动作（七项，缺一不可）

| 动作 | 作用 |
|---|---|
| 新 `pgvector` 容器重建，只绑 `127.0.0.1:54321->5432` | 消除公网暴露面 |
| 旧感染容器归档证据后删除 | 留证 + 去活 |
| `pgvector` 的 `postgres` 密码轮换 | 断掉已知凭据 |
| 容器内 XMRig 残留隔离到 `/root/incident-quarantine/` | 留证，不直接删 |
| 宿主机 PostgreSQL 外部登录规则移除 | 消除第二条入口 |
| `5432/54321` 加本机防火墙规则 + systemd 持久化 | 防重启后失效 |
| 恶意 IP `210.97.42.242` 加入出站阻断 | 断掉回连与二次拉取 |

最后一项加固：`pg_hba.conf` 收紧为只允许宿主机 Docker 网关 `172.17.0.1/32`。

**「归档证据后删除」而不是直接删**是处置流程里最容易做错的一步。直接删掉容器，后续复盘、取证、向上汇报都没有材料。

## 对比：为什么这个入口比普通 SQLi 危险

`COPY FROM PROGRAM` 不是漏洞，是合法 SQL 功能：

- 只允许超级用户或持有 `pg_execute_server_program` 的角色执行 —— **但很多部署默认就用超级用户连库**
- 它是合法 SQL，WAF 与常规 SQL 注入检测都不拦
- 它执行的是数据库**服务端**的命令，因此在容器里就是容器内的 shell。而容器往往挂载宿主目录、持有过高权限

## 排查顺序（四步，可以复用）

```text
5.1 确认可疑进程是否仍在运行
    ps -eo pid,ppid,user,lstart,etime,cmd --sort=start_time
      | egrep -i 'kinsing|kdevtmpfsi|210\.97\.42\.242|base64 -d|curl\.txt|wget\.txt|pg22|xmrig|supportxmr'
5.2 核查容器暴露面       ← 看端口绑定是 0.0.0.0 还是 127.0.0.1
5.3 读取 PostgreSQL 日志  ← 找 COPY FROM PROGRAM 的原始语句与时间
5.4 查找落地文件          ← 按进程的 cwd 与 /tmp、/dev/shm 找
```

**顺序不能反**：先确认「还在不在跑」再谈清理，否则可能在处理一个已经结束的进程，而真正的活跃进程被忽略。

## 加固清单（可落地）

1. 数据库端口永不绑 `0.0.0.0`，只绑 `127.0.0.1` 或内网地址
2. 应用连接用非超级用户，显式 `REVOKE` 掉 `pg_execute_server_program`
3. 容器去掉 `CAP_SYS_ADMIN`，只读挂载根文件系统，`/tmp` 用 `tmpfs`
4. 出站流量白名单 —— 挖矿回连靠出站，这一步拦住能大幅降低损失
5. 防火墙规则持久化到 systemd，别只写 `iptables` 不落盘
6. `pg_hba.conf` 按来源网段收紧，不用 `trust`

## 未定论的分歧

- **时间线有矛盾**：原文记录「2026-04-10 的告警在容器日志中对应 `2026-04-09 21:28:30 UTC`」，时区差 8 小时成立，但两条告警的具体时段未写清；第二次排查日志指向 `2026-05-07`。本页日期取事件收尾月。
- **初始入侵路径未确认**：是弱口令猜测还是凭据从别处泄露，本仓无结论。所以加固清单里的「密码轮换」是止血，不是根因修复。

## 相关

- 另一类「证据可追溯」的工程做法（从 LLM 输出侧防，而非从处置侧查）：[[wiki/sources/原理图与-edif-工作流]]

## 证据

- `安全运维复盘.md` §「执行摘要」
- `安全运维复盘.md` §「攻击链还原」
- `安全运维复盘.md` §「关键 IOC」
- `安全运维复盘.md` §「排查过程」（5.1–5.4）
- `安全运维复盘.md` §「处置动作」（6.1 起）

## 相关页面

已建档的 source 页：[[wiki/sources/安全运维复盘]]
