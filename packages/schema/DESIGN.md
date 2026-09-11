# @dp_ui/schema — 数据驱动 UI 编排层 · 设计说明

| 项目   | 内容                                                                        |
| ------ | --------------------------------------------------------------------------- |
| 版本   | v0.1（草案）                                                                |
| 日期   | 2026-09-03                                                                  |
| 状态   | 待评审                                                                      |
| 位置   | `packages/schema`                                                        |
| 技术栈 | Vue 3.5 · TypeScript · 复用 @dp_ui/core 组件（`{style,comp}`+v-model 契约） |

> 本文档记录 @dp_ui/core「数据驱动」方向重设计的背景、理念、决策与待确认项。
> 用户不在场时由助手自主决策推进，本文件即为决策留痕，供评审后调整。

---

## 1. 背景与问题

现有 `@dp_ui/core` 是「页面级组件库」：开发者在模板里逐个手写 `<DpButton :comp=... />`、
`<DpInput v-model=... />`，界面结构、样式与交互数据全部散落在模板代码中。

**新方向（数据驱动）**：把「界面长什么样」与「数据怎么来/怎么存」从模板中抽离为**元数据**：

1. **schema 元数据决定样式** —— 传入一棵 schema 节点树：`component` 决定渲染什么，
   `props`/`style`（含 class / cssVars / size / variant 等）决定结构与样式；
2. **绑定数据 / 数据源提供交互数据** —— `field` 把控件绑定到 model 字段，
   `dataSource`（静态选项 / 异步函数 / 远程请求 / 依赖联动）提供交互数据，
   `visible`/`disabled` 表达联动，`rules` 声明校验。

渲染引擎根据 schema + model 自动装配出完整的 @dp_ui/core 组件树，开发者从「拼模板」转向「写 schema」。

---

## 2. 定位与包结构

- **保留 @dp_ui/core 作为底层基础组件库**（不再推倒重建）；
- **新增 `@dp_ui/schema` 作为数据驱动编排层**，通过适配层把 @dp_ui/core 组件注册为渲染目标；
- @dp_ui/schema 自身只负责「编排 + 数据通道」，不含视觉样式实现，样式的最终呈现仍来自 @dp_ui/core
  及其 `--dp-*` 令牌体系。

```
packages/
├── core/         # @dp_ui/core 基础组件库（不变，作底层）
└── schema/       # @dp_ui/schema 数据驱动编排层（本库）
    ├── src/
    │   ├── types/        # schema 元数据模型（节点/样式/数据源/条件/规则/注册表）
    │   ├── runtime/      # 纯逻辑：路径读写、条件求值、数据源、校验、样式映射、上下文
    │   ├── composables/  # useFieldOptions 等响应式组合
    │   ├── adapters/     # installDpUi：把 @dp_ui/core 组件注册进 registry
    │   └── components/   # DsSchema / DsForm / DsNode / DsControl
    └── vitest.config.ts  # 单测（jsdom）
```

### 组件前缀与命名

- 前缀 `Ds`（Data Schema），与 @dp_ui/core 的 `Dp` 前缀并列区分；
- schema 的 `component` 名采用小写单词（`input`/`select`/`grid`/`panel`…），
  与 @dp_ui/core 注册的组件名一一映射，可自由扩展。

---

## 3. 核心概念（Schema 元数据模型）

一个 schema 节点是一段可序列化的元数据，涵盖「结构/样式」「绑定数据」「交互数据」三类信息：

```ts
interface DsNode {
  // —— 结构 / 样式（决定渲染什么、长什么样）——
  component: string // 渲染目标组件（经 registry 解析）
  key?: string // 节点键
  props?: Record<string, any> // 业务 props（@dp_ui/core 组件映射到 comp）
  style?: DsStyle // 样式元数据（class/style/cssVars/size/variant/span…）
  children?: DsNode[] // 子节点（容器类组件）
  text?: string // 需默认插槽文本的组件（按钮/标签…）

  // —— 绑定数据（交互数据之一）——
  field?: string // 绑定 model 字段路径（'user.name' / 'items[0].x'）
  fallbackValue?: unknown // model 为空时的展示回退
  valueType?: 'string' | 'boolean' | 'number' | 'any'

  // —— 数据源（交互数据之二）——
  dataSource?: DsDataSource // 选项：静态 / 惰性 / 远程 / 依赖联动

  // —— 联动 / 约束 ——
  visible?: DsCondition // 显隐（boolean | (ctx)=>boolean）
  disabled?: DsCondition // 禁用（同上）
  rules?: DsRule[] // 校验规则
  help?: string // 帮助文案
}

type DsSchemaInput = DsNode | DsNode[] // 根可传单节点或数组
```

### 样式如何「由 schema 决定」

`DsStyle` 收敛了组件外观的公共维度（class / 内联 style / cssVars / size / variant / round /
block / bordered / span），adapter 负责把它们映射到具体组件：

- 对 @dp_ui/core 组件（`{ style: DpStyleProps, comp }`）：`style` 元数据 → 组件的 `style` prop，
  其 class / cssVars / size / variant 与 @dp_ui/core 的令牌体系天然打通；
- 对原生组件：直接合并 class / style / cssVars。

### 数据源如何「提供交互数据」

```ts
interface DsDataSource {
  options?: DsOption[] | (() => DsOption[] | Promise<DsOption[]>) // 静态 / 惰性
  remote?: { url; method?; params?; map(response): DsOption[] } // 远程
  dependsOn?: string[] // 监听 model 字段，变化自动重载（级联）
  optionsKey?: string // 选项写入组件 props 的键（默认 'options'）
  immediate?: boolean // 是否立即加载（默认 true）
}
```

渲染器经 `useFieldOptions` 加载选项并注入组件（select/radio 的 `comp.options`），
`dependsOn` 变化时自动重新拉取 —— 「绑定数据 / 数据源驱动交互」闭环成立。

---

## 4. 渲染引擎与注册中心

### 4.1 渲染流

```
DsSchema(根) ─ provide context { model, registry, request, errors }
   └─ DsNode（递归单节点）
        ├─ 有 field → 字段布局：label + DsControl + help + error(span 支持栅格)
        ├─ 有 children → 容器：DsControl 渲染容器组件，children 递归为 DsNode
        └─ 其他 → DsControl 直接渲染（展示组件 / text）
DsControl：把 node → 组件 vnode（dp/native 契约、v-model 绑定、选项注入、disabled）
```

### 4.2 上下文（provide/inject）

- `model`：绑定数据对象（响应式，字段写回这里）
- `registry`：组件注册表（component 名 → 组件 + 适配元数据）
- `request`：远程请求实现（默认 fetch，可注入 Tauri 等宿主实现）
- `errors`：字段错误集（校验写入、字段级展示）

### 4.3 注册中心

```ts
new DsRegistry().register('select', {
  component: DpSelect,
  contract: 'dp',
  valueType: 'string',
  optionsKey: 'options',
})
```

- `contract: 'dp'`：组件遵循 @dp_ui/core `{style, comp}` 契约（默认）；
- `contract: 'native'`：普通 props 组件（class/style 透传）；
- `valueType`：字段受控时空值归一化（空值回退）；
- `optionsKey`：数据源选项注入的 props 键。

`installDpUi(registry)` 批量注册 @dp_ui/core 常用组件；使用方也可注册自己的组件来扩展。

---

## 5. 使用形态（示意）

```ts
const fields: DsNode[] = [
  {
    component: 'input',
    field: 'name',
    label: '姓名',
    style: { size: 'large' },
    props: { placeholder: '请输入姓名' },
    rules: [{ required: true, message: '姓名必填' }],
  },
  {
    component: 'select',
    field: 'city',
    label: '城市',
    dataSource: {
      options: [
        { label: '北京', value: 'bj' },
        { label: '上海', value: 'sh' },
      ],
    },
    visible: ({ model }) => model['open'] === true,
  },
  {
    component: 'switch',
    field: 'vip',
    label: 'VIP',
    valueType: 'boolean',
  },
]
```

```vue
<!-- model 为 reactive/ref 响应式对象；字段通过 field 就地写回 -->
<DsForm :model="form" :fields="fields" :columns="2" @submit="onSubmit" />
<!-- 或通用递归渲染 -->
<DsSchema :model="form" :schema="pageSchema" />
```

校验通过 `validate()` 触发；错误自动落到字段下方（ds-field__error）。

---

## 6. 已实现（v0）

| 模块     | 说明                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 类型系统 | `DsNode` / `DsStyle` / `DsDataSource` / `DsCondition` / `DsRule` / registry 类型                                                                  |
| 运行时   | path 读写、条件求值、options 加载、校验、样式归一化、上下文                                                                                       |
| 渲染     | `DsSchema`（递归根）/ `DsForm`（表单便捷）/ `DsNode` / `DsControl`                                                                                |
| 适配     | `installDpUi`：button/tag/badge/avatar/divider/card/empty/space/grid/panel/input/textarea/number/switch/checkbox/radio/select/spin/skeleton/alert |
| 文档     | 本文件 + 包 README                                                                                                                                |

---

## 7. 自主决策留痕（待评审确认）

用户不在场，助手按以下假设推进，**评审后可低成本调整**：

1. **保留 @dp_ui/core，新增 @dp_ui/schema 而非改造 @dp_ui/core 包本身** —— @dp_ui/core 已大量实现且有演示/构建产物，
   推倒重来破坏大；以「编排层 + 适配」方式演进最稳妥。
2. **包名 `@dp_ui/schema`、前缀 `Ds`** —— 若希望叫 `@dp_ui/core` 的 v2 / 其它名字，改 package.json + 前缀即可。
3. **首期聚焦「字段/表单 + 展示 + 容器」数据驱动闭环**，未做整页路由驱动（page 层）与 Table
   复杂数据绑定 —— 引擎与 schema 模型已支持递归容器，后续可在 DsSchema 上叠 page/table 能力。
4. **不引入第三方组件库/表达式引擎**（沿用 @dp_ui/core 硬约束）：条件用函数/布尔，数据源 options 用
   函数/静态/远程（fetch，可注入宿主实现）。
5. **依赖关系**：@dp_ui/schema dev 依赖 @dp_ui/core（workspace），通过相对路径 + `@`→@dp_ui/core 源码的
   路径映射在 dev/测试中直接使用 @dp_ui/core 源码（同 playground 现有做法）。

### 待用户确认

- [ ] 新库命名（@dp_ui/schema / 其它）与组件前缀
- [ ] 覆盖范围：仅表单？+ 列表/Table？整页 page 驱动？
- [ ] schema 是否需支持远程 JSON（后端下发/低代码回放），从而需更强序列化约束
- [ ] @dp_ui/core 与 @dp_ui/schema 的长期关系（并行 vs @dp_ui/schema 取代 @dp_ui/core 对外主入口）
