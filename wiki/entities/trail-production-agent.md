---
type: entity
title: "trail-production-agent"
entity_kind: project
domain: ai
aliases: [trail-production-agent, 试产搭配, 试产搭配工作台, X6728]
tags: [project, fastapi, mariadb, bom, manufacturing]
concepts: ["wiki/concepts/游标分页"]
---

# trail-production-agent

## 是什么 / 在我的体系里的位置

试产搭配工作台：PM 上传客户 BOM 与图纸，按 X6728 一类的芯片规则做搭配、校核与在线编辑，产出可交付的搭配草稿。技术栈是 FastAPI + MariaDB + 原生 JS 单页（`web/index.html` 内联脚本 + `workspace.js`），页面每次请求现读文件。

与 [[wiki/entities/letter-auto|letter-auto]] 属同一类「制造业文档 → 结构化结论」的工程，但运行模型相反：letter-auto 刻意把编排收回 Python、模型只做单点取证；本仓则是 agent 参与生成，人工在工作台上改。

## 已知问题与判断

- **列表必须按归属人隔离，而不是按「登录了就给看」** → 见 [[wiki/concepts/游标分页]] 的服务端片段
  · 归属键是工号 `staff_no`（不是用户名），`trial_project.owner_staff_no` 由迁移 `0010_project_owner.sql` 加列并回填历史 actor
  · 中间件 `authorize` 里用一条正则 `/api/projects/(\d+)` 拦所有项目子路由，不通过返回 **404 而不是 403**——403 等于告诉探测者「这个 id 存在」
  · 状态：已完成，含 `test_project_isolation_by_owner_staff_no` 用例

- **dev mock 登录天然破坏隔离** → 见本页「待澄清」
  · 本地调试账号固定 `staff_no='local-dev'`，所有人的项目在开发环境都落在同一个工号下，隔离逻辑在本地测不出来

- **列表分页一次做到位，别等数据量起来** → 见 [[wiki/concepts/游标分页]]
  · 改前是全表全量返回（SQL 里连 `LIMIT` 都没有），改后是 keyset + `LIMIT page_size+1`

## 关键配置与用法

```text
入口        run.py / scripts/restart.sh（PyCharm 里直接跑 run.py）
端口        127.0.0.1:8018（TRIAL_ROOT_PATH 为空时页面挂在站点根）
迁移        uv run python scripts/migrate.py
测试        uv run pytest（全量约 140s）；前端用例是 tests/*.cjs，用 node 直接跑
页面        src/trail_production_agent/web/index.html，每次请求现读，改前端不必重启
```

`./scripts/restart.sh` 依赖 `ss` 与 `/proc`，**在 macOS 本机跑不起来**，本机只能由 PyCharm 重启进程。

## 相关实体 / 相关概念

- [[wiki/entities/fastapi]] —— 服务层框架
- [[wiki/entities/letter-auto]] —— 同类的文档→结论工程，运行模型相反
- [[wiki/concepts/游标分页]] —— 历史记录列表的分页机制

## 时间线

- **2026-10-30**：项目列表加归属隔离（`owner_staff_no` + 中间件 404 闸）与 keyset 游标分页；面板「项目列表」改名「历史记录」，顶栏标题改「试产搭配工作台」

## 待澄清

- dev mock 共享 `local-dev` 账号，使隔离在开发环境失效，mariadb 侧真实隔离行为目前只被一条用例覆盖
- 无 revision 的存量项目回填时落到共享的 `local-dev`，等于不隔离。是否该给它们一个「无主」哨兵值，未定

## 相关页面

- [[wiki/concepts/游标分页]]
