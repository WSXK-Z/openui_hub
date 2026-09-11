# @dp_ui/schema

数据驱动的 UI 编排/渲染层（Vue 3 · TypeScript），把 **@dp_ui/core 组件**组织成可被 schema 驱动渲染的界面。

> 设计说明与决策留痕见 [`DESIGN.md`](./DESIGN.md)。

## 核心理念

- **schema 元数据决定结构/样式**：传一棵 `DsNode` 树（`component` + `props` + `style` + `children`），
  引擎负责渲染成 @dp_ui/core 组件树；
- **绑定数据 / 数据源提供交互数据**：`field` 绑定 model、`dataSource` 提供选项、
  `visible`/`disabled` 表达联动、`rules` 声明校验。

## 快速开始

```ts
import { reactive } from 'vue'
import { DsForm, installDpUi, defaultRegistry } from '@dp_ui/schema'
import type { DsNode } from '@dp_ui/schema'

// 注册 @dp_ui/core 组件为渲染目标（一次即可，通常在入口调用）
installDpUi(defaultRegistry)

const fields: DsNode[] = [
  {
    component: 'input',
    field: 'name',
    label: '姓名',
    rules: [{ required: true, message: '请填写姓名' }],
  },
  {
    component: 'select',
    field: 'city',
    label: '城市',
    dataSource: {
      options: [
        { label: '北京', value: 'beijing' },
        { label: '上海', value: 'shanghai' },
      ],
    },
  },
]

const form = reactive({ name: '', city: '' })

// 模板中
// <DsForm :model="form" :fields="fields" :columns="2" @submit="onSubmit" />
```

## 主要 API

| API                                               | 说明                                     |
| ------------------------------------------------- | ---------------------------------------- |
| `<DsSchema :model :schema>`                       | 通用递归渲染器（节点树/数组）            |
| `<DsForm :model :fields :columns>`                | 表单便捷入口（字段布局 + 校验 + submit） |
| `DsNode` / `DsControl`                            | 单节点渲染 / 控件元素渲染（内部）        |
| `installDpUi(registry)`                           | 注册 @dp_ui/core 组件到 registry         |
| `defaultRegistry` / `DsRegistry`                  | 全局默认 / 自定义注册表                  |
| `validateField(s)` / `evalCondition` / `getPath`… | 运行时纯函数（可单测）                   |

## 开发（pnpm workspace）

```sh
pnpm --filter @dp_ui/schema type-check   # 类型检查
pnpm --filter @dp_ui/schema test:unit    # 单元测试（vitest + jsdom）
pnpm --filter @dp_ui/schema lint         # oxlint
pnpm dev:web                         # 演示应用（含 schema 演示页 /schema-demo）
```

## 组件注册表

`schema.component` 名 → registry entry（`contract` / `valueType` / `optionsKey`）。
内置 `installDpUi` 已适配：`button tag badge avatar divider card empty space grid panel
input textarea number switch checkbox radio select spin skeleton alert`。

自定义组件注册示例：

```ts
registry.register('my-widget', {
  component: MyWidget, // 任意 Vue 组件
  contract: 'native', // 非 @dp_ui/core 契约组件
})
```
