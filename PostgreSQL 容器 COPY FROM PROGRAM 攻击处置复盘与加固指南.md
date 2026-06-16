---
title: PostgreSQL 容器 COPY FROM PROGRAM 攻击处置复盘与加固指南
date: 2026-06-16
desc: 公网暴露的 PostgreSQL 被 COPY FROM PROGRAM 攻击后，如何止血、如何加固、为什么默认配置会失守。
category: 安全 / 运维
tags: [PostgreSQL, 应急响应, 安全加固]
---

# PostgreSQL 容器 COPY FROM PROGRAM 攻击处置复盘与加固指南

> 适用场景：PostgreSQL 暴露在公网后，攻击者通过超级用户权限执行 `COPY FROM PROGRAM`，进而触发编码命令、下载器、挖矿程序或蠕虫脚本的应急处置。
> 
> 本文档基于 2026-04 至 2026-05 期间 `pgvector` 容器告警处置过程整理。文中不包含服务器登录密码或数据库明文密码。

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZWIyMjkzMzI2ZWE0ZWE0N2Y4ODY0ZTdmZDU1MjNjMGJfNDEyMWYwZTZhYmEwYzdiNzkxOTY4NmU4ZTM3OWQ0ZWJfSUQ6NzYzNzEzNDAxNTE0NDg0MDM4M18xNzgxNTk0ODYxOjE3ODE1OTg0NjFfVjM)



图片说明：上图由内置 `gpt-image2` 生成，用于表达“暴露数据库容器被编码命令攻击后，通过隔离、留证、轮换密码、网络阻断完成处置”的整体思路。

## 执行摘要

本次告警不是误报。攻击者通过暴露在公网的 `pgvector` PostgreSQL 容器端口访问数据库，并利用 PostgreSQL 超级用户可执行服务端程序的能力，发起 `COPY FROM PROGRAM` 命令。该命令通过 `base64` 编码隐藏真实脚本，解码后尝试连接恶意下载源 `210.97.42.242:8088`，并下载后续脚本执行。

处置结果：

- 新 `pgvector` 容器已重建，只绑定 `127.0.0.1:54321->5432`。
- 旧感染容器已归档证据后删除。
- `pgvector` 的 `postgres` 密码已轮换。
- 容器内 XMRig 挖矿残留已隔离到 `/root/incident-quarantine/`。
- 宿主机 PostgreSQL 外部登录规则已移除。
- 数据库端口 `5432/54321` 已加本机防火墙拦截规则，并通过 systemd 服务持久化。
- 恶意下载 IP `210.97.42.242` 已加入出站阻断。
- 新 `pgvector` 的 `pg_hba.conf` 已收紧，只允许宿主机 Docker 网关 `172.17.0.1/32` 访问。

## 事件背景

### 2.1 资产信息

<sheet sheet-id="pB7GsX" token="AUV6sZUEWhLuTatdQkxcKZV5nld"></sheet>

### 2.2 告警概览

<sheet sheet-id="iVRQfa" token="AUV6sZUEWhLuTatdQkxcKZV5nld"></sheet>

两条告警属于同一攻击链，命令模式、父子进程、恶意下载 IP 均一致。2026-04-10 的告警在容器日志中对应 `2026-04-09 21:28:30 UTC`。

## 攻击链还原



核心风险点是 PostgreSQL 的 `COPY FROM PROGRAM`。该能力只允许超级用户或拥有 `pg_execute_server_program` 的角色执行。若 PostgreSQL 超级用户密码泄露、弱口令，或者服务被公网暴露，攻击者可以把数据库进程变成命令执行入口。

本次恶意脚本行为摘要：

- 试图终止常见挖矿进程：`kinsing`、`kdevtmpfsi`。
- 优先使用 `curl` 拉取恶意脚本。
- 其次使用 `wget` 拉取恶意脚本。
- 如果没有 `curl/wget`，则使用 Bash `/dev/tcp` 自实现 HTTP 下载。
- 下载源为 `210.97.42.242:8088`。
- 观察到历史挖矿配置指向 `pool.supportxmr.com:443`。

## 关键 IOC

<sheet sheet-id="dSm4xp" token="AUV6sZUEWhLuTatdQkxcKZV5nld"></sheet>

已留证文件：

<sheet sheet-id="nRIq8e" token="AUV6sZUEWhLuTatdQkxcKZV5nld"></sheet>

## 排查过程

### 5.1 确认可疑进程是否仍在运行

ps -eo pid,ppid,user,lstart,etime,cmd --sort=start_time \

  | egrep -i 'kinsing|kdevtmpfsi|210\\.97\\.42\\.242|base64 -d|curl\\.txt|wget\\.txt|pg22|xmrig|supportxmr' \

  | grep -v egrep

结论：处置时未发现告警进程仍在运行。

### 5.2 核查容器暴露面

docker ps --no-trunc --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

ss -ltnp | egrep ':5432|:54321'

发现旧 `pgvector` 容器通过 `0.0.0.0:54321->5432` 对公网开放，是主要入口。

### 5.3 读取 PostgreSQL 日志

docker logs --since '2026-04-09T21:20:00Z' \

  --until '2026-04-09T21:40:00Z' \

  pgvector

关键日志显示：

- `COPY ... FROM PROGRAM` 被执行。
- 子进程被中断。
- 事务回滚，攻击临时表删除失败但最终未残留在共享数据卷里。
- 命令尝试访问 `210.97.42.242:8088`。

### 5.4 查找落地文件

find /tmp /var/tmp /dev/shm -xdev -maxdepth 3 -type f \

  -printf '%TY-%Tm-%Td %TH:%TM:%TS %u:%g %m %s %p\n' 2>/dev/null | sort

发现容器内存在历史挖矿残留：

/tmp/.postgres/config.json

/tmp/.postgres/rediserver

`config.json` 中包含 XMRig 配置，矿池为 `pool.supportxmr.com:443`。

## 处置动作

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZWI4MTZhNGQ1ZmE1OGYzM2IxM2VmNjE1NDc2NzUwMGNfZjNkNTQxM2JjNWQ1NTZhNWQ5ODA2YzM4ZWY0MjUyY2NfSUQ6NzYzNzEzNDA1NTEwNDIzNjQ5MV8xNzgxNTk0ODYxOjE3ODE1OTg0NjFfVjM)

图片说明：上图由内置 `gpt-image2` 生成，用于表达处置后的目标状态：公网入口被阻断，宿主机防火墙和 Docker 网络边界生效，PostgreSQL 容器只接受本机受控访问，证据和密码轮换独立留存。

### 6.1 临时隔离数据库端口

iptables -I INPUT 1 -i lo -p tcp -m multiport --dports 5432,54321 -j ACCEPT

iptables -I INPUT 2 -p tcp -m multiport --dports 5432,54321 -j DROP

ip6tables -I INPUT 1 -i lo -p tcp -m multiport --dports 5432,54321 -j ACCEPT

ip6tables -I INPUT 2 -p tcp -m multiport --dports 5432,54321 -j DROP

注意：本机使用的是 `iptables v1.8.5 (nf_tables)`，规则计数可以增长，但外部连通性测试容易受到本地网络环境影响。因此不能只依赖客户端 `nc` 结果，必须结合服务监听、PostgreSQL 认证规则和云安全组共同收敛暴露面。

### 6.2 轮换 `pgvector` 超级用户密码

newpw="\$(openssl rand -base64 36 | tr -d '\n')"

passfile="/root/pgvector-postgres-password-rotated-\$(date +%Y%m%d-%H%M%S).txt"

umask 077

printf 'pgvector postgres password rotated at %s CST\npassword=%s\n' "$(date '+%F %T')" "$newpw" > "\$passfile"



docker exec -i -u postgres pgvector psql -X -v ON_ERROR_STOP=1 -v newpw="\$newpw" <<'SQL'

ALTER ROLE postgres WITH PASSWORD :'newpw';

SQL

密码文件只允许 root 读取，处置记录中只记录路径，不记录明文。

### 6.3 隔离恶意落地文件

quar="/root/incident-quarantine/pgvector-\$(date +%Y%m%d-%H%M%S)"

pgpid="\$(docker inspect -f '{{.State.Pid}}' pgvector)"

mkdir -m 700 -p "\$quar"

cp -a "/proc/$pgpid/root/tmp/.postgres" "$quar/"

rm -rf --one-file-system "/proc/\$pgpid/root/tmp/.postgres"

保留证据后再删除，避免直接清理导致无法复盘。

### 6.4 重建 `pgvector` 容器

vol="\$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' pgvector)"

image="\$(docker inspect -f '{{.Config.Image}}' pgvector)"



docker update --restart=no pgvector

docker stop pgvector

docker rename pgvector pgvector-incident-\$(date +%Y%m%d-%H%M%S)



docker run -d \

  --name pgvector \

  --restart always \

  --pull=never \

  -p 127.0.0.1:54321:5432 \

  -v "$vol:/var/lib/postgresql/data" \  -e POSTGRES_PASSWORD="$pw" \

  "\$image"

关键点：

- 复用原数据卷，避免业务数据丢失。
- 丢弃旧容器可写层，去除 `/tmp`、`/var/tmp`、`/dev/shm` 等非持久目录残留。
- 新容器端口只绑定 `127.0.0.1`，不再暴露到公网。

### 6.5 删除旧感染容器

在删除前归档：

docker inspect pgvector-incident-\* > /root/incident-quarantine/pgvector-old-inspect-before-rm.json

docker logs pgvector-incident-\* > /root/incident-quarantine/pgvector-old-full-logs-before-rm.log 2>&1

docker diff pgvector-incident-\* > /root/incident-quarantine/pgvector-old-diff-before-rm.txt 2>&1

docker rm pgvector-incident-\*

### 6.6 收紧 `pg_hba.conf`

原容器规则允许任意来源：

host all all all scram-sha-256

处置后收紧为只允许宿主机 Docker 网关：

host all all 172.17.0.1/32 scram-sha-256

重新加载配置：

docker exec -u postgres pgvector psql -X -Atqc "select pg_reload_conf();"

验证规则：

docker exec -u postgres pgvector psql -X -Atqc \

  "select line_number,type,database,user_name,address,netmask,auth_method,error from pg_hba_file_rules order by line_number;"

横向访问验证：

docker run --rm --network bridge -e PGPASSWORD="\$pw" \

  ankane/pgvector:latest \

  psql -h 172.17.0.4 -p 5432 -U postgres -d postgres -X -Atqc "select 1;"

期望结果：

FATAL: no pg_hba.conf entry for host "172.17.0.5"

### 6.7 处理宿主机 PostgreSQL

宿主机 PostgreSQL 也监听 `0.0.0.0:5432`。虽然本次告警来自容器，但它同样是高风险入口。

处置动作：

- 注释 `pg_hba.conf` 中 `douya@0.0.0.0/0` 外部登录规则。
- reload 宿主机 PostgreSQL。
- 确认 `pg_hba_file_rules` 中不再存在 `0.0.0.0/0` 允许规则。

建议后续更彻底改为：

listen_addresses = 'localhost'

前提是确认没有业务依赖公网直连宿主机 PostgreSQL。

### 6.8 持久化防火墙规则

创建 systemd oneshot 服务：

/etc/systemd/system/db-containment-firewall.service

/usr/local/sbin/db-containment-firewall.sh

服务功能：

- 保留本机访问 `5432/54321`。
- 拒绝外部访问 `5432/54321`。
- 拒绝宿主机和容器转发访问 `210.97.42.242`。
- 为 Docker `DOCKER-USER` 链补充容器入口阻断规则。

启用：

systemctl daemon-reload

systemctl enable --now db-containment-firewall.service

systemctl status db-containment-firewall.service --no-pager -l

## 验证清单

### 7.1 容器状态

docker ps -a --no-trunc --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

期望：

pgvector   Up   127.0.0.1:54321->5432/tcp

不应再存在旧感染容器。

### 7.2 端口监听

ss -ltnp | egrep ':5432|:54321'

期望：

- `pgvector` 映射端口只监听 `127.0.0.1:54321`。
- 若宿主机 PostgreSQL 仍监听 `0.0.0.0:5432`，必须同时确认 `pg_hba.conf` 和云安全组已阻断外部访问。

### 7.3 可疑进程

pgrep -af 'rediserver|xmrig|kinsing|kdevtmpfsi|210\\.97\\.42\\.242|base64 -d|pg22|supportxmr' || true

期望：无输出。

### 7.4 PostgreSQL 攻击临时表

docker exec -u postgres pgvector sh -lc '

for d in $(psql -X -Atqc "select datname from pg_database where datallowconn and not datistemplate order by 1"); do  echo DB:$d

  psql -X -d "\$d" -Atqc "select schemaname,tablename from pg_tables where tablename like '\\''\\\_%'\\'' escape '\\''\\'\\'' order by 1,2"

done'

期望：无攻击临时表残留。

### 7.5 新告警观察

docker logs --since '2026-05-07T10:22:00Z' pgvector 2>&1 \

  | egrep -i 'program|base64|rediserver|xmrig|210\\.97\\.42\\.242|COPY .\*PROGRAM'

期望：无新增恶意命令。

## 复盘经验

### 8.1 根因

根因不是某个单独文件，而是数据库服务暴露面和超级用户权限组合导致的远程命令执行风险：

1. PostgreSQL 容器端口映射到 `0.0.0.0:54321`。
2. 数据库超级用户可从外部登录。
3. 超级用户具备 `COPY FROM PROGRAM` 执行能力。
4. 容器缺少最小化网络和认证限制。
5. 旧容器可写层中已有历史挖矿残留，说明攻击不是单次事件。

### 8.2 为什么不能只 kill 进程

告警进程通常是一次性命令，排查时可能已经退出。只 kill 进程无法解决：

- 数据库公网暴露。
- 数据库密码泄露或弱口令。
- PostgreSQL 超级用户被滥用。
- 容器可写层恶意文件。
- 定时任务、启动项或横向访问风险。

正确做法是按“阻断入口、保留证据、清理残留、重建可信运行环境、验证闭环”的顺序处理。

### 8.3 为什么要重建容器

容器内 `/tmp`、`/dev/shm`、`/var/tmp` 是攻击者常用落地点。即使删除已知文件，也无法证明没有未知残留。重建容器可以丢弃旧可写层，保留数据卷，降低漏清风险。

### 8.4 为什么要收紧 `pg_hba.conf`

只把 Docker 端口绑定到 `127.0.0.1` 可以阻止公网直接访问，但同一 Docker bridge 网络里的其他容器仍可能访问容器 IP。收紧 `pg_hba.conf` 后，即使其他容器能路由到 `172.17.0.4:5432`，也会被 PostgreSQL 自身拒绝。

## 后续建议

### 9.1 云安全组

在阿里云安全组中同步限制：

- 禁止公网访问 `5432`。
- 禁止公网访问 `54321`。
- 若确需远程数据库访问，只允许固定办公 IP 或 VPN 出口 IP。

### 9.2 凭据治理

- 更换服务器 root 密码。
- 检查是否存在复用的数据库密码。
- 避免把数据库超级用户用于业务连接。
- 为业务创建最小权限用户，禁止授予 `SUPERUSER` 和 `pg_execute_server_program`。

### 9.3 PostgreSQL 配置

推荐基线：

listen_addresses = 'localhost'

log_statement = 'ddl'

log_min_duration_statement = 1000

对于暴露给应用的数据库：

- 只监听内网或本机地址。
- 使用强密码或证书认证。
- 对业务用户禁用高危权限。
- 开启足够日志以追踪异常 DDL、`COPY FROM PROGRAM`、登录失败。

### 9.4 Docker 暴露面

推荐启动方式：

docker run -d \

  --name pgvector \

  --restart always \

  -p 127.0.0.1:54321:5432 \

  -v "\$vol:/var/lib/postgresql/data" \

  ankane/pgvector:latest

避免：

-p 54321:5432

-p 0.0.0.0:54321:5432

### 9.5 监控规则

建议重点监控：

- 进程命令包含 `base64 -d | bash`。
- PostgreSQL 日志包含 `COPY ... FROM PROGRAM`。
- 网络连接访问 `210.97.42.242`。
- 文件路径出现 `/tmp/.postgres/`。
- 进程名或命令包含 `xmrig`、`rediserver`、`kinsing`、`kdevtmpfsi`。
- 容器新增 `0.0.0.0` 端口映射。

## 快速应急 SOP



最小闭环：

1. 判断是否还在运行。
2. 阻断入口。
3. 保留日志和落地文件证据。
4. 轮换密码。
5. 重建容器。
6. 收紧 PostgreSQL 访问控制。
7. 验证进程、日志、端口、横向访问。
8. 在云安全组做同等限制。

## 本次生成资产

<sheet sheet-id="EKufph" token="AUV6sZUEWhLuTatdQkxcKZV5nld"></sheet>

两张配图均由内置 `gpt-image2` 生成，并复制到当前工作目录，便于文档长期引用。