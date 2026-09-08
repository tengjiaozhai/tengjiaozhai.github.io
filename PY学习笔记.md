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
