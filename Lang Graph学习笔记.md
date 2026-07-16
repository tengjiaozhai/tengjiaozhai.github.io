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