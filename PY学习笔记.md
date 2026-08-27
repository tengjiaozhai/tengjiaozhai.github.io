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
