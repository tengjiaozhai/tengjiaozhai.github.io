---
title: Python 学习笔记
date: 2026-09-14
desc: 面向 Java 工程师的 Python 学习笔记，记录模块、类型、对象身份、协程、async/await，以及 AgentScope 工具执行链路中的 yield、raise 和异步队列。
category: AI / Agent
tags: [Python, Java, asyncio, 协程, AgentScope]
---

## __init__.py 声明"包对外公开什么"，
下划线约定声明"什么不该碰"，两者合起来才是 Python 的封装。
```
  包 catalog/
  │
  ├── __init__.py          ← 门面（声明公共 API）
  │   ├── from .loader import load_rules   ← 搬运：外部可以短路径导入
  │   └── __all__ = [...]                  ← 白名单：写死公共清单
  │
  └── loader.py             ← 实现模块
      ├── load_rules()      ← 公共符号（被搬运到门口）
      └── _private_helper() ← 私有符号（下划线约定，不用搬）
```

只有import * 才会导入all中的内容，单个方法import 阻止不了

## 接口
```python
class Probe(Protocol):
```
Protocol 是 Python 的结构化子类型（structural subtyping）机制。和 Java interface 的区别在于：Java 要求 `implements Probe` 显式声明，Python Protocol 是鸭子类型——只要你的类有匹配的属性和方法签名，就自动被视为 `Probe` 的实现，不需要显式 `implements` 它。

| Python | Java | 含义 |
|---|---|---|
| `Protocol` | `interface` | 纯契约，无实现 |
| `...` 方法体 | 无方法体的抽象方法 | 签名声明，不提供实现 |
| 属性声明无赋值 | getter 方法声明 | 实现类必须提供 |
| `@runtime_checkable` | 天然支持 `instanceof` | 运行时类型检查 |
| 鸭子类型匹配 | `implements` 显式声明 | 结构兼容即视为实现 |

## 类型检查
```python
type(r.probe).__name__ == "ExtractProbe"  # 精确匹配，只看当前类型
isinstance(r.probe, ExtractProbe)          # 继承感知，子类也算
```

区别在继承：
```python
class SpecialExtractProbe(ExtractProbe):
    pass

p = SpecialExtractProbe()

type(p).__name__ == "ExtractProbe"   # False — 类型名是 "SpecialExtractProbe"
isinstance(p, ExtractProbe)           # True  — 它是 ExtractProbe 的子类
```

| Python | Java | 行为 |
|---|---|---|
| `type(obj).__name__ == "Foo"` | `obj.getClass().getName().equals("Foo")` | 精确匹配，不认子类 |
| `type(obj) is Foo` | `obj.getClass() == Foo.class` | 精确匹配，类型安全 |
| `isinstance(obj, Foo)` | `obj instanceof Foo` | 继承感知，子类也算 |

绝大多数情况用 `isinstance`。用 `type().__name__` 通常是因为类还没导入，或者故意要排除子类（少见）。

## id()

`id(obj)` 把对象身份折算成整数（CPython 里就是对象的堆地址）。唯一常见用途：当 dict 键，做"按对象身份"的缓存。

Java 不需要这个函数：引用本身是现成的身份值，能 `==`、能当键（IdentityHashMap）。Python 的 dict 键是**值相等**语义（hash + `__eq__`），不是身份，所以想按"同一个对象"做缓存时没有现成容器，只能 `id()` 数值化。

为什么不直接拿对象当键：

- 类一旦重写 `__eq__`/`__hash__`（dataclass、框架上下文几乎都会），值相等的两个对象就在 dict 里互相覆盖，判键从身份漂移成值相等；
- dict 强引用键，对象不会被回收，防泄漏还得换弱引用容器，标准库里没有 IdentityHashMap 那种东西。

```python
cache_key = id(ctx)  # 身份变整数，语义/生命周期契约一次剥干净
```

| Python | Java | 含义 |
|---|---|---|
| `id(obj)` | （无；引用即身份） | 身份数值化 |
| `a is b` | `a == b`（引用比较） | 身份比较 |
| dict 键 = hash + `__eq__` | HashMap 键 = hashCode + equals | 值相等判键 |
| `id()` 当键 | `IdentityHashMap` | 按身份缓存 |
| 弱键容器 | `WeakHashMap` | 键不阻止回收 |
| 手动 `clear()` | — | id 缓存只能靠外部纪律管生命周期 |

最大的坑：**id 只在对象存活期间唯一**。CPython 引用计数归零立刻回收，内存马上被新对象复用，同一个 id 会安静地属于下一个对象。Java 引用不会过期（握着引用对象就必活），Python 的 id 整数躺在缓存里时对象可能已经死了——陈旧缓存不报错，只给错数据。

心智模型：对象 = 客房，id = 房号，变量 = 通讯录条目。房号只在你握着房卡（对象活着）时算数；退房后房号给新房客。跨请求活着的 `dict[房号]` 就是过期登记本。

工程准则：id() 缓存等价于 Java 里"每个请求 new 一个 IdentityHashMap，入口 finally 里 clear"。短生命周期、单入口、入口保证 clear，可以用；ctx 生命周期不可控或多入口交错时，改用缓存挂 ctx 属性（随 ctx 生灭），或 `weakref.WeakKeyDictionary`。

## 协程与 await

协程是一个能暂停、能恢复的函数。`async def` 调用只产出一个惰性对象，`await` 才驱动它执行，并在拿不到结果时把控制权交还给驱动者（Task → 事件循环）。

```python
# asyncio.Future.__await__ —— 整个机制的缩影
def __await__(self):
    if not self.done():
        yield self          # 我不行，把"等什么"交给 Task
    return self.result()    # 被唤醒后取结果，也可能抛

# await x 约等于 yield from x.__await__()
```

`await` 有四种结局：

| 写法 | 行为 |
|---|---|
| `await fut`，fut 已完成 | `if` 不成立 → 不 yield、不让出、原地取值 |
| `await fut`，fut 未完成 | `yield self` → Task 挂 done 回调，返回事件循环 |
| `await fut`，fut 失败 | `result()` 抛异常 → `throw` 回 await 所在那一行 |
| `await coro` | 你亲自驱动它，它是你调用栈上的一层，别的 Task 并发不了 |

Task 侧的对应实现（CPython 3.11 `asyncio/tasks.py`）：

- `:277` `coro.send(None)` 驱动一步，返回值就是协程 yield 出来的东西
- `:297` `_asyncio_future_blocking` 是个一次性标志位，区分"真在等这个 Future"和"随手 yield 了它"
- `:314` `add_done_callback(self.__wakeup)` 挂起发生在这里，挂完 Task 就返回事件循环
- `:286` `StopIteration.value` 就是协程的 return 值。协程没有别的通道返回

**关键推论**：`await` 不保证切换。目标已完成、或目标内部没有真挂起点时，原地继续。`async def` 里可以一个 `await` 都没有（letter-auto 的 `_material_rows_from_ocr_facts` 就是），await 它等于同步调用，不让出控制权。

Java 的对应物是虚拟线程（JDK 21）。两者都是用户态并发，差别在谁定义让出点、调度器跑在几条 OS 线程上：

| 维度 | Python 协程 async/await | Java 21 虚拟线程 |
|---|---|---|
| 让出点 | 你显式写 `await` | JDK 改造过的阻塞 API，隐式让出 |
| 传染性 | 有，调用链一路 `async` | 无，普通方法调用 |
| 调度器 | asyncio 事件循环 | ForkJoinPool |
| 承载线程 | 1 条 OS 线程 | N 条 carrier 线程 |
| 一处没让出 | 整个事件循环停摆 | 只占住 1 个 carrier，其余照跑 |
| 栈放哪 | 协程 frame 直接在堆上 | 未挂起时在 carrier 栈上，挂起时拷到堆 |
| 切换成本 | 状态机跳转，几乎零拷贝 | mount/unmount 要拷栈 chunk |
| 抢占式? | 否，纯协作 | 否，也是协作（只在阻塞点 unmount） |

两个反直觉的点：

- **虚拟线程不是抢占式**。它只在阻塞点 unmount，CPU 密集循环不会 yield，Javadoc 明确说不适合长时间计算。它是"更便宜的阻塞"，不是"更好的线程"。
- **跨语言对应关系是反的**。Java 里最像 Python 协程的是 Reactor / `CompletableFuture` 那套链式 API（显式让出 + 传染）；Python 里最像虚拟线程的是 gevent / eventlet 的猴子补丁。虚拟线程的本质就是"把 gevent 那套做进 JVM，并且能跑在多条 carrier 线程上"。

JDK 21 的坑：`synchronized` 块和 `Object.wait()` 会 pin 住 carrier 线程，到 JDK 24 的 JEP 491 才修。Python 侧没有 pinning 这个概念，对应的坑是"在协程里调阻塞函数"。

图解：[协程与 await：一个能暂停的函数](output/coroutine-await.html)（浏览器打开，9 段图解 + 可步进的 10 帧时序图：生命周期 → 一次 await 的完整往返 → CPython 源码对应 → 本质三行 → 四种结局 → 四者关系 → Java 虚拟线程对照 → letter-auto 真实调用链）

## AgentScope 工具异常链路：一个 `yield`、一个 `raise` 和一个队列哨兵

图解：[AgentScope 工具异常链路：yield / raise / queue sentinel](output/agentscope-yield-raise-sentinel.html)（浏览器打开：调用树 → 三种执行剧本 → `yield`/`raise`/`await queue.put` 对照 → 队列消费顺序 → 回归测试契约）

这节复盘 `examples/agent_service/main.py` 里的 `boom_tool`。它不是“一个函数调用失败后直接 return”的同步链路，而是**异步生成器产出事件，中间任务把事件搬进队列，另一个协程再消费队列**。从 Java 工程的视角，最好把它拆成三个通道：`yield` 负责事件流，`raise` 负责异常流，`asyncio.Queue` 负责中间解耦；三者不是同一个“返回值”。

### 先看完整调用树

```text
POST /chat/
  └─ ChatService.run                 # HTTP 只负责启动后台执行
      └─ Agent.reply_stream           # 事件最终经 SSE 发布
          └─ Agent._execute_tool_call # 权限、状态、上下文和事件
              └─ Agent._acting        # middleware hook
                  └─ ToolOffloadMiddleware.on_acting
                      ├─ _drain_to_queue()  # 后台 Task，生产者
                      │   └─ next_handler → Toolkit.call_tool
                      │       └─ FunctionTool → boom_tool
                      └─ queue.get()        # 当前协程，消费者
```

对应的代码位置（行号会随上游变化）：`main.py:54-56` 定义并 `raise`；`tool/_toolkit.py:225-392` 产生工具结果；`app/middleware/_tool_offload_middleware.py:169-220` 搬运、消费并判断终止；`agent/_agent.py:2439-2711` 把工具结果写入上下文并发出结束事件。

### 一个 `yield`：不是 return，而是“交出一条事件后暂停”

`Toolkit.call_tool` 的返回类型是异步生成器。可以先把它读成下面这个最小模型：

```python
async def call_tool(...):
    yield chunk          # 中间进度 / 工具输出
    ...
    yield tool_response  # 聚合后的终态结果
```

调用 `async def` 本身不会执行函数体；`async for` 每次向它“要下一个值”时，函数才继续运行。走到 `yield` 时发生三件事：

1. 当前对象交给调用方；
2. 当前 frame 保留，函数暂停；
3. 调用方下一次继续拉取时，从这个 `yield` 后面恢复。

Java 可以用两种熟悉的形状近似理解：

| AgentScope/Python | Java 工程化近似 | 注意 |
|---|---|---|
| `yield chunk` | Reactor `sink.next(chunk)` / `Iterator` 产生一个元素 | 是流中的一条事件，不是方法最终返回值 |
| `yield tool_response` | 最后一条终态事件，随后流完成 | 本项目把它当作工具调用的 terminal item |
| `async for item in stream` | 消费 `Publisher` 或异步迭代器 | 每次拉取可能让出事件循环 |
| `return value` | 普通方法 `return value` | 一次性结束；异步生成器用 `yield` 逐条产出 |

因此，`yield tool_response` 放在哪里非常关键。它不是“无论如何都打印一下结果”，而是**告诉上游：工具已经有一个可接受的最终结果**。如果工具实际抛出了致命异常，却先 `yield` 一个默认的 `ToolResponse(content=[], state=SUCCESS)`，上游就可能把失败误判成成功。

### 一个 `raise`：就是沿调用链执行 `throw`

复现工具是：

```python
async def boom_tool() -> ToolChunk:
    raise DeveloperOrientedException("boom: 演示 DevExc (M4-1 repro)")
```

从 Java 看就是：

```java
ToolChunk boomTool() {
    throw new DeveloperOrientedException("boom: 演示 DevExc (M4-1 repro)");
}
```

AgentScope 的工具层会区分三类结果：

| 工具函数发生什么 | `Toolkit.call_tool` 的处理 | Agent 是否能把错误作为工具结果继续推理 |
|---|---|---|
| 普通 `RuntimeError` 等 `Exception` | 变成 `ToolChunk(state=ERROR)`，再聚合成 `ToolResponse` | 可以，模型能看到错误文本 |
| `DeveloperOrientedException` | 按开发者错误重新抛出：`raise e from None` | 不按普通工具错误处理，本轮向外失败 |
| `asyncio.CancelledError` | 生成 `INTERRUPTED` 工具结果 | 表示中断，不是普通失败 |

这里的 `DeveloperOrientedException` 不是“所有工具错误的父类”；它的类文档语义是“抛给开发者”。如果产品目标是让 Agent 看到错误后自我修复，工具应抛普通异常或 `AgentOrientedException`，不能只因为页面上看起来都是“工具报错”就把两种语义合并。

### `await queue.put(_QUEUE_SENTINEL)`：把“结束标记”放进中间邮箱

中间件里有一条后台排水任务：

```python
async def _drain_to_queue() -> None:
    try:
        async for item in next_handler(**input_kwargs):
            await queue.put(item)
    except Exception as exc:
        await queue.put(exc)
    finally:
        await queue.put(_QUEUE_SENTINEL)
```

逐行翻译成 Java 思路：

```text
next_handler 产生一条 item
  → await queue.put(item)       # 放进线程安全的异步邮箱
  → 消费者 await queue.get()    # 另一边取走

发生 Exception
  → 把 exception 对象本身放进邮箱
  → finally 再放一个 _QUEUE_SENTINEL
```

`_QUEUE_SENTINEL = object()` 是一个只用于身份比较的特殊对象，近似 Java 并发程序里的 `POISON_PILL`：

| Python | Java 近似 | 含义 |
|---|---|---|
| `await queue.put(item)` | `blockingQueue.put(item)` | 把一条数据放入中间队列；不等于发给浏览器 |
| `await queue.get()` | `blockingQueue.take()` | 没有数据时等待，有数据时取一条 |
| `await queue.put(exc)` | 把异常对象作为消息入队 | 队列不会自动抛异常，消费者必须主动检查 |
| `await queue.put(_QUEUE_SENTINEL)` | 放入 poison pill | 告诉消费者“生产者不会再产生更多 item” |

这里的 `await` 有一个容易漏掉的细节：它**不保证一定发生线程切换**。当前代码使用默认的无界 `asyncio.Queue()`，通常 `put` 可以立即完成；如果队列被改成有界且已满，`await` 才会真正挂起，等消费者腾出空间。无论是否挂起，语义都是“入队”，不是“等消费者处理完”。

消费者的判断顺序是整个 bug 的关键：

```python
item = await queue.get()

if item is _QUEUE_SENTINEL:
    completed = True
    break

if isinstance(item, BaseException):
    drain_task.cancel()
    raise item

pre_collected.append(item)
if isinstance(item, ToolResponse):
    completed = True
    break
```

正常时，队列大致是：

```text
ToolChunk → ToolChunk → ToolResponse → _QUEUE_SENTINEL
                         ↑ 终态       ↑ 生产结束
```

`ToolResponse` 和 `_QUEUE_SENTINEL` 都能让消费者停止，但角色不同：`ToolResponse` 表示“工具已有终态结果”，哨兵表示“后台生产者结束了”。哨兵不是广播，也不会自动把异常抛给调用方；它只是队列中的最后一个消息。

### 旧 bug：`finally` 里的一个 `yield` 把后面的 `raise` 遮住了

当前 HEAD 的旧形状是：

```python
try:
    ...
except Exception as e:
    if isinstance(e, DeveloperOrientedException):
        raise e from None
    ...
finally:
    yield tool_response       # 旧代码：异常时也会先产出
```

`boom_tool` 的实际顺序变成：

```text
boom_tool raise DeveloperOrientedException
  → Toolkit 命中开发者异常分支，准备继续 raise
  → finally 先 yield 默认 ToolResponse([], SUCCESS)
  → _drain_to_queue 把这个 ToolResponse 入队
  → 消费者看到 ToolResponse，立即标记 completed 并退出
  → drain_task 被 cancel，不再继续拉取生成器
  → 后面的原始异常没有到达上层
```

这不是 `raise` 消失了，而是**在异步生成器尚未恢复到异常传播点之前，调用方已经根据伪造的终态停止消费**。Java 里可以类比为：

```java
sink.next(emptySuccessfulResponse); // 下游以为完成
cancelDrain();                       // 不再继续订阅
throw fatalException;                // 这条路径没人再观察
```

最小修复形状是让终态 `yield` 只发生在正常完成或已处理错误之后：

```diff
 try:
     ...
 except DeveloperOrientedException:
     raise
 finally:
-    yield tool_response

+yield tool_response  # 只对成功 / 已处理 ERROR / INTERRUPTED 执行
```

修复后的 `boom_tool` 顺序：

```text
boom_tool raise
  → Toolkit 不产生假的 ToolResponse
  → _drain_to_queue 捕获异常对象并 queue.put(exc)
  → finally queue.put(_QUEUE_SENTINEL)
  → 消费者先取到 exc，执行 raise item
  → ChatService 得到回复级 ERROR
```

注意队列里的顺序是 `exc → sentinel`，所以消费者会先处理异常；如果消费者先把哨兵当成完成信号而不检查前面的异常，仍然会复现另一种“异常被忽略”。

### 为什么 `responses == []` 也能证明测试通过

回归测试的契约可以写成：

```python
responses = []
with self.assertRaisesRegex(DeveloperOrientedException, "boom: repro"):
    async for item in agent._acting(tool_call):
        responses.append(item)

assert responses == []
```

`assertRaisesRegex` 的 `with` 代码块相当于 JUnit 的 `assertThrows`：

1. 代码块里必须抛出 `DeveloperOrientedException`；
2. 异常文本必须匹配 `boom: repro`；
3. 异常被捕获后，测试继续执行后面的断言。

所以 `responses` 为空不是“没有发生任何事情”，而是证明**致命异常发生在第一个可交付结果之前**。完整通过条件是：

```text
正确异常到达调用方 + 没有先发假的成功结果 = PASS
```

旧代码会先把空 `ToolResponse` 放进 `responses`，随后消费者提前结束，`assertRaises` 等不到异常，于是测试失败。测试通过也不表示 `boom_tool` 不再报错，恰好表示它现在按设计报错且没有被伪装成成功。

### 不要把两个问题合成一个结论

修复“空 SUCCESS 遮住致命异常”后，异常确实可以到达服务层；但这不自动保证 HITL 状态收尾。引用会话里已经观察到另一条边界：`DeveloperOrientedException` 让回复以 `ERROR` 结束时，原来的工具调用仍可能停留在 `asking`，会话仍是 `awaiting_permission`，页面同时出现“回复失败”和“工具运行中”。

```text
问题 A：Toolkit / offload
  致命异常不能先伪装成空 SUCCESS

问题 B：Agent / Service / UI 生命周期
  回复失败后，pending / asking 工具调用必须被关闭或标成终态
```

普通 `RuntimeError` 走 `ToolResultEndEvent(state=error)` 的可恢复路径，和 `DeveloperOrientedException` 的回复级失败路径不是同一个契约。提 PR 或写测试时，要先选定“致命但清理”还是“转成 ERROR 后继续推理”，不要用一个 `yield` 修复同时声称两条链路都已解决。
