---
type: source
title: "thoughts/039 使用缓存减少工具重复调用"
source_file: "thoughts/039_✅使用缓存减少工具重复调用.md"
source_type: thought-batch
domain: ai
raw_digest: "109-c0ac8549"
lines: 109
captured: 2026-10-19
status: verified
tags: [llmentor, cache, tool-design]
entities: ["wiki/entities/redis", "wiki/entities/agentscope"]
concepts: ["wiki/concepts/工具缓存"]
---

# thoughts/039 使用缓存减少工具重复调用

## 这一篇覆盖什么

在 ReActAgent「推理→调工具→再推理」的循环里，重复调用几乎是必然的。四种来源：

1. **同一轮多步**：规划一次差旅，模型可能在校验餐标、校验酒店标、生成方案时各查一次差旅政策——其实是同一份数据
2. **跨会话高频**：用户每开一轮新对话，Agent 都可能召回一次「他的出行偏好」，而偏好画像几小时内根本不变
3. **跨工具接力**：规划工具算出的方案，紧接着要交给审核工具/子 Agent，不落地审核方就得把整个规划重跑一遍
4. **模型的不确定性**：LLM 有时会「忘了自己刚查过」，再调一次同样的工具

## 重复代价的三档梯度

**越靠后越该缓存**：

```text
查库（便宜但累积可观）
  → 跨网络慢调用（百炼召回、外部 API，几百 ms 起）
    → 外部配额（按次计费的第三方接口，重复 = 烧钱）
```

gogo-agent 的缓存点正是沿着这条代价梯度铺开的。

## 会话级缓存的三个字段（并发策略各不相同）

```java
public class AgentSessionContext {
  // ① 差旅政策：政策按城市分层（一线/新一线/其他）而不同，必须以【城市】为键
  //    工具可能并发执行，用 ConcurrentHashMap 保证线程安全
  private final Map<String, String> travelPolicyByCity = new ConcurrentHashMap<>();

  // ② 用户联系/乘机人信息（JSON）：会话内准静态，但一旦被 update 就必须失效
  private volatile String userContactInfo;

  // ③ 用户常驻/办公城市（JSON）：会话内【无写入口】，可安全长缓存
  private volatile String userBaseLocation;
}
```

**三个字段三种策略，这是本篇最值得记的地方**：不是所有会话内缓存都能一律 `volatile` 或一律 `ConcurrentHashMap`，取决于「是否并发读」「是否有写入口」。

## 可抽出的原子

- **重复调用的四种来源** —— 比「缓存能提速」具体得多
- **代价三档梯度** —— 决定缓存优先级
- **三个字段的差异化并发策略** —— `ConcurrentHashMap`（并发 + 分键）/ `volatile`（准静态 + 有写入口需失效）/ `volatile`（无写入口，可长缓存）
- **`ToolExecutionContext` 的透明注入** —— `AgentSessionContext` 对 LLM 不可见，无需 `@ToolParam`

## 与其他笔记的重叠点

- **两层缓存的完整判据** → [[wiki/concepts/工具缓存]]（`agent 开发学习笔记.md` §3 的表）
- **旁路缓存的两条规则** → [[wiki/concepts/旁路缓存]]
- **跨工具接力** → [[wiki/sources/thoughts-方案设计用工具]]（044 的「只报数 + Redis 存方案」）
- **不该缓存什么** —— 实时天气/航班这类强时效数据 → `thoughts/046`、[[wiki/sources/thoughts-工具家族定义]]

## 本篇独有、别处没有的

1. **三个缓存字段的完整代码与逐字段策略说明** —— 本仓最细的缓存实现记录
2. **「重复代价三档梯度」** —— 缓存优先级的排序依据
3. **`ToolExecutionContext` 透明注入机制** —— 缓存对象怎么进到工具方法里而不被模型看到

## 证据

- `thoughts/039_✅使用缓存减少工具重复调用.md`（108 行）
- `agent 开发学习笔记.md` §3 是同一主题的上位总结
