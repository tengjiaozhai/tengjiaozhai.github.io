---
type: source
title: "thoughts/086 行程规划的执行闭环"
source_file: "thoughts/086_✅Harness工程——行程规划的执行闭环.md"
source_type: thought-batch
domain: ai
raw_digest: "84-fd0b41e9"
lines: 84
captured: 2026-10-19
status: verified
tags: [llmentor, harness, plan-execute, reflection]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/Plan-Execute"]
---

# thoughts/086 行程规划的执行闭环

## 这一篇覆盖什么

行程规划不是「搜几趟航班 + 选家酒店」那么简单：

```text
去程 10 × 酒店 4 × 返程 10 = 400 种组合
每条组合要核验政策合规、偏好打分
偏好打分带强主观性
```

一次 plan 几乎不可能首轮全 pass。所以需要 `Plan → Execute → Reflection` 的闭环。

## 可抽出的原子

- **400 方案的规模感** —— 比 `thoughts/044` 的 60 种组合更极端的例子，进一步强化「组合爆炸必须用代码算」的判据
- **「首轮必然不过关」是设计的前提假设** —— 闭环不是异常处理，是常态路径
- **Reflection 在闭环里的位置** —— 执行之后、修改之前

## 与其他笔记的重叠点

- **为什么选 Plan-Execute** → [[wiki/concepts/Plan-Execute]]、`thoughts/042`
- **规划智能体的完整实现** → [[wiki/sources/thoughts-智能体设计]]（043）
- **审核子智能体的独立立场** → [[wiki/sources/thoughts-子智能体vs-skill]]（052）
- **Reflexion 提示词技巧** → [[wiki/sources/thoughts-提示词工程]]（074）—— 名字相近但不同层：074 是提示词手法，本篇是架构闭环

## 本篇独有、别处没有的

1. **400 方案的组合爆炸测算** —— 比 044 的 60 更极端
2. **Plan-Execute-Reflection 三段闭环的完整描述**
3. **「harness 工程」视角下的执行闭环** —— 与 `Harness学习笔记.md` 的 Durable Runtime 是同一层的不同切面（一个讲调度闭环，一个讲持久化恢复）

## 证据

- `thoughts/086_✅Harness工程——行程规划的执行闭环.md`（83 行）
