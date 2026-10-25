---
type: source
title: "thoughts/063 下单用 Skill、取消用 Tool"
source_file: "thoughts/063_✅预定时，为什么下单用skill，取消用工具？.md"
source_type: thought-batch
domain: ai
raw_digest: "121-957a069b"
lines: 121
captured: 2026-10-19
status: verified
tags: [llmentor, skill, tool-design, idempotency]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/Skill-vs-Tool", "wiki/concepts/幂等与写入恢复"]
---

# thoughts/063 下单用 Skill、取消用 Tool

## 这一篇覆盖什么

预订智能体（BookingAgent）里有个乍看很别扭的不对称：

- **下单**（出机票 / 订酒店 / 订火车票）：没有任何一个 Java `@Tool` 负责下单。LLM 读 `tuniu-cli` 技能文档，自己拼出 `tuniu call flight saveOrder -a '{...}'` 这样的命令，用 Shell 工具跑掉；`BookingPersistenceHook` 在命令跑完后**被动旁听**、把结果落库。整条链路是 **Skill + LLM + Hook**
- **取消**：偏偏有一个正儿八经的 Java `@Tool` —— `cancel_booking`（在 `BookingWriteTools` 里）。LLM 只是调用这把工具，真正的编排（校验、调平台、改状态、回话）全在 Java 里

同一个业务域、同一套 `tuniu` CLI，为什么下单敢放手给模型，取消却要收回代码手里？

## 答案：**由「操作错了会怎样」和「要不要精确编排」决定的控制权归属差异**

### 下单：无中生有，适合被动 Hook 旁观

下单在数据层面是「无中生有」—— 先跑命令、平台返回一坨不可预测的响应，再从里面抠出订单号落成一条新记录。这种形态天然适合**被动 Hook 旁观**。

```java
// agent/hook/BookingPersistenceHook.java
@Override
public int priority() { return 20; }   // 落库为纯副作用，放在命令注入类 Hook（3/5）之后即可

@Override
public <T extends HookEvent> Mono<T> onEvent(T event) {
    if (event instanceof PostActingEvent postActing) {
        try {
            handlePostActing(postActing);
        } catch (Exception e) {
            // 落库失败不得影响主流程 ← 关键：异常被吞掉，绝不打断 ReAct 主循环
            logger.error("[BookingPersistence] 预订记录落库异常", e);
        }
    }
    return Mono.just(event);   // 无论成败，事件原样放行
}
```

整条下单旁路在 `PostActingEvent` 阶段被动触发，落库失败也只记日志、把事件原样 return，绝不影响 LLM 继续往下走。

### 取消：有据可依，Java 精确编排

取消是状态机迁移，每一步都能预判，所以收回代码手里。

## 可抽出的原子

→ [[wiki/synthesis/Skill-vs-Tool判据]] 已完整收录三个判据与这处实例

其中「幂等」这一层尤其值得单独记：**取消天然幂等（重复取消无害），下单不幂等（重复下单有害）** —— 幂等性是选择 Skill 还是 Tool 的一个隐含判据，见 [[wiki/concepts/幂等与写入恢复]]。

## 与其他笔记的重叠点

- **反方向的对照** → [[wiki/sources/thoughts-方案设计用工具]]（044）—— 方案计算用 Tool，无中生有的写操作用 Skill
- **Skill 接入** → [[wiki/sources/thoughts-外部skill接入]]（049 途牛）
- **Hook 生命周期** → `agent 开发学习笔记.md` §13、`PY学习笔记.md` §「洋葱模型」
- **预订工具（读 + 取消写）** → [[wiki/sources/thoughts-工具家族定义]]（037）

## 本篇独有、别处没有的

1. **这处不对称的完整论证** —— 本仓最反直觉的一个设计选择
2. **`BookingPersistenceHook` 的完整代码** —— 含 `priority() = 20`、「异常吞掉、事件原样放行」
3. **「无中生有 vs 有据可依」这个判据的表述** —— 比「简单 vs 复杂」更准确
4. **幂等性作为隐含判据** —— 原文没有明说，但从取消/下单的差异可以推出

## 证据

- `thoughts/063_✅预定时，为什么下单用skill，取消用工具？.md`（120 行）
