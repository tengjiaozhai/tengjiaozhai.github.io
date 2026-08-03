---
title: LangGraph 学习笔记
date: 2026-07-15
desc: LangGraph CLI 安装与 Tool 定义三种写法（@tool 装饰器、BaseModel schema、Annotated 标注）。
category: AI / Agent
tags: [LangGraph, Tool, Python]
---

# 快速入门

创建Python虚拟环境
pip install virtualenv

安装LangGraph CLI
1. 创建Python 3.11+虚拟环境：`virtualenv langgraph-env` → 激活：`langgraph-env/Scripts/activate`（Windows）/ `source langgraph-env/bin/activate`（Linux/Mac）
2. 安装CLI：`pip install --upgrade "langgraph-cli[inmem]"`
3. 创建应用：`langgraph new my-app --template new-langgraph-project-python`
4. 安装依赖：`cd my-app` → `pip install -e .`
5. 修改graph.py：配置本地私有化大模型、定义工具

# Tool定义

###  第一种写法
```python
@tool(return_direct=False)  
def calculate(a: float, b: float, operation: str) -> float:
# 在外部用 StructuredTool 标注类型  
# 运行时 calculate 已经是 StructuredTool 实例，功能完全一样。  
# PyCharm 没提示是因为 @tool 装饰器的返回类型签名写得不够精确，静态分析推断不出具体类型，加类型标注只是为了弥补缺陷  
calculate_tool: StructuredTool = calculate
```
**Runnable转工具**：通过as_tool方法将LangChain可运行对象转换为工具，可自定义名称、描述、参数schema。

### 第二种写法
```python
class CalculateArgs(BaseModel):  
    a:float = Field(description="第一个需要输入的数字")
```
<table>
<tr><th>Python 类</th><th>类比 Java 类</th></tr>
<tr><td><code>object</code></td><td><code>Object</code>，所有类的根父类</td></tr>
<tr><td><code>BaseModel</code></td><td>带验证功能的 DTO / POJO 基类</td></tr>
</table>

**类比与 @Data**

<table>
<tr><th>能力</th><th>普通 class</th><th>BaseModel</th></tr>
<tr><td>类型校验</td><td>手动写</td><td>自动</td></tr>
<tr><td>JSON Schema 生成</td><td>手动写</td><td><code>.model_json_schema()</code> 一行</td></tr>
<tr><td>字段描述（给 LLM 看）</td><td>手动写</td><td><code>Field(description=...)</code></td></tr>
<tr><td>序列化/反序列化</td><td>手动写</td><td><code>.model_dump()</code> / <code>.model_validate_json()</code></td></tr>
<tr><td>默认值处理</td><td>手动写</td><td>直接声明</td></tr>
</table>

```python
@tool('calculate',args_schema=CalculateArgs)  #name + schema
def calculate(a: float, b: float, operation: str) -> float:  
    """计算两数运算"""  # description
```


### 第三种写法（Annotated）

```python
@tool('calculate')  
def calculate3(a: Annotated[float,'第一个输入的数字'],  
              b: Annotated[float,'第二个要输入的数字'],  
              operation: Annotated[str,'运算类型']) -> float:  
    """计算两数运算"""
print(calculate3.invoke({'a':40,'b':2,'operation':'*'}))
```

`Annotated[类型, 元数据]` 是 Python 标准库的类型标注工具，在参数上同时声明类型和描述，无需单独定义 BaseModel。`@tool` 自动提取描述生成 JSON Schema。

类比 Java 参数注解：

<table>
<tr><th>Python</th><th>Java</th></tr>
<tr><td><code>a: Annotated[float, '描述']</code></td><td><code>@Parameter(description="描述") float a</code></td></tr>
<tr><td>类型标注语法</td><td>注解语法</td></tr>
<tr><td>框架从 <code>__annotations__</code> 读取</td><td>框架通过反射读取注解</td></tr>
</table>

# AgentState
| 类型           | 描述                            | 可变性 | 生命周期  |
| ------------ | ----------------------------- | --- | ----- |
| Configurable | 运行开始时传入的不可变数据（如user_id、API密钥） | 不可变 | 单次运行  |
| AgentState   | 执行期间可变的动态数据（如工具返回结果、中间状态）     | 可变  | 单次运行  |
| 长期记忆（Store）  | 跨会话共享的数据（如用户偏好）               | 可变  | 跨多次运行 |
## state

| Configurable | 单次运行内只读（节点不能修改），但每次运行可以传入不同的值 |     |
| ------------ | ----------------------------- | --- |
| AgentState   | 单次运行内可变（节点可以读写），图执行过程中会不断累积   |     |
```python
thread_id = config['configurable'].get('thread_id', 'unknown')
```
类似java中的双重hashmap

```python
class CustomState(AgentState):
    user_name: str 
这就是继承，等价于 Java 的：
public class CustomState extends AgentState {
    String userName;
}
```

## checkpointer
短期记忆
```python
PostgresSaver.from_conn_string(DB_URI) as checkpointer

checkpointer.setup()

    agent = create_agent(  
        model,  
        tools=[runnable_tool, search_tool],  
        system_prompt="你是一个智能助手，尽可能的调用工具回答用户的问题",  
        checkpointer=checkpointer,  
        store=store,  
    )
    
    config = {  
        "configurable":{  
            "thread_id": "1"  
        }  
    }
```
## store
长期记忆
```python
PostgresSaver.from_conn_string(DB_URI) as store,

store.setup()
```

# WorkFlow
```python
chain = model | StrOutputParser() 
```
这是 LangChain 的 LCEL（LangChain Expression Language） 语法，用 |  把组件串成链：

| 解析器 | 输出类型 | 用途 |
|--------|----------|------|
| StrOutputParser | 纯字符串 | 最简单，只要文本 |
| JsonOutputParser | JSON 对象 | 需要结构化数据 |
| PydanticOutputParser | Pydantic 模型 | 需要验证的结构化数据 |

## Literal

限制字段只能是特定值之一：

```python
from typing import Literal

grade: Literal["funny", "not funny"]
# 只能是 "funny" 或 "not funny"，其他值会报错
```

类比 Java：类似枚举，但更轻量

```java
// Java 等价
enum Grade { FUNNY, NOT_FUNNY }
```

## Field

给字段添加元数据（描述、示例、验证等）：

```python
grade: Literal["funny", "not funny"] = Field(
    description="判断笑话是否幽默",      # 字段描述，LLM 会看到
    examples=["funny", "not funny"]      # 示例值，帮助 LLM 理解
)
```

## 组合效果

```python
class Feedback(BaseModel):
    grade: Literal["funny", "not funny"] = Field(...)
```

生成 JSON Schema 给 LLM：

```json
{
  "grade": {
    "type": "string",
    "enum": ["funny", "not funny"],
    "description": "判断笑话是否幽默",
    "examples": ["funny", "not funny"]
  }
}
```

简单总结：

- **Literal** = 值只能是这几个
- **Field** = 给字段加说明，让 LLM 知道怎么用

# StateGraph 构建流程

## 1. 创建图

```python
builder = StateGraph(state)
```

- `state` 是状态类型定义（TypedDict）
- 类比 Java：`new StateMachine<State>()`

## 2. 添加节点（处理逻辑）

```python
builder.add_node('generator', generator_func)   # 生成冷笑话
builder.add_node('evaluator', evaluator_func)   # 评估笑话
```

- 每个节点是一个函数，接收 state，返回更新
- 类比 Java：`addHandler("generator", GeneratorHandler::handle)`

## 3. 添加边（控制流程）

```python
builder.add_edge(START, 'generator')              # 入口 → generator
builder.add_edge('generator', 'evaluator')        # generator → evaluator
```

- 固定边：无条件跳转
- 类比 Java：`transition(START, "generator")`

## 4. 条件边（分支逻辑）

```python
builder.add_conditional_edges(
    'evaluator',           # 从哪个节点出发
    router_func,           # 路由函数（决定去哪）
    {"end": END, "generator": "generator"}  # 映射表
)
```

`router_func` 的逻辑：

```python
def router_func(state):
    if state['funny_or_not'] == 'funny':
        return 'end'        # 映射到 END
    else:
        return 'generator'  # 映射到 generator
```

- 类比 Java：`addConditionalTransition("evaluator", router, Map.of("end", END, "generator", "generator"))`

## 5. 编译

```python
evaluate_agent = builder.compile()
```

- 把图定义编译成可执行的 agent
- 类比 Java：`builder.build()`

## 完整流程图

```
START → generator → evaluator → [条件判断]
                                    ↓
                              funny? → END
                              not funny? → generator（循环）
```

## 关键概念

- **节点** = 处理函数
- **边** = 控制流
- **条件边** = 分支/循环
- **state** = 在节点间传递的共享数据      

