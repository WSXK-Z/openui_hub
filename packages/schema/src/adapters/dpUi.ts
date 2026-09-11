/**
 * @dp_ui/core 适配层：把 @dp_ui/core 的既有组件注册为 @dp_ui/schema 的渲染目标。
 *
 * 说明：
 * - 通过相对路径直接引用 @dp_ui/core 的 `.vue` 源文件（monorepo dev/测试环境一致，
 *   避免经过 @dp_ui/core 打包产物与其 `uno.css` 虚拟模块）；
 * - 组件统一走 @dp_ui/core 的 `{ theme, comp }` + v-model 契约（contract: 'dp'）；
 * - 选择类组件声明 `optionsKey: 'options'`，供 dataSource 注入选项。
 */
import DpAlert from '../../../core/src/components/feedback/alert/DpAlert.vue'
import DpAvatar from '../../../core/src/components/common/avatar/DpAvatar.vue'
import DpBadge from '../../../core/src/components/feedback/badge/DpBadge.vue'
import DpButton from '../../../core/src/components/common/button/DpButton.vue'
import DpCard from '../../../core/src/components/common/card/DpCard.vue'
import DpCheckbox from '../../../core/src/components/data-entry/checkbox/DpCheckbox.vue'
import DpDivider from '../../../core/src/components/common/divider/DpDivider.vue'
import DpEmpty from '../../../core/src/components/data-display/empty/DpEmpty.vue'
import DpGrid from '../../../core/src/components/layout/grid/DpGrid.vue'
import DpInput from '../../../core/src/components/data-entry/input/DpInput.vue'
import DpInputNumber from '../../../core/src/components/data-entry/input-number/DpInputNumber.vue'
import DpPanel from '../../../core/src/panel/DpPanel.vue'
import DpRadio from '../../../core/src/components/data-entry/radio/DpRadio.vue'
import DpSelect from '../../../core/src/components/data-entry/select/DpSelect.vue'
import DpSkeleton from '../../../core/src/components/feedback/skeleton/DpSkeleton.vue'
import DpSpace from '../../../core/src/components/layout/space/DpSpace.vue'
import DpSpin from '../../../core/src/components/feedback/spin/DpSpin.vue'
import DpSwitch from '../../../core/src/components/data-entry/switch/DpSwitch.vue'
import DpTag from '../../../core/src/components/common/tag/DpTag.vue'
import DpTextarea from '../../../core/src/components/data-entry/textarea/DpTextarea.vue'
import type { DsRegistryEntry } from '../types/registry'
import type { DsRegistry } from '../types/registry'

/** 已内置适配的 @dp_ui/core 组件表（schema component 名 → registry entry） */
const dpUiComponents: Record<string, DsRegistryEntry> = {
  // 通用 / 展示
  button: { component: DpButton, contract: 'dp', description: '按钮' },
  tag: { component: DpTag, contract: 'dp', description: '标签' },
  badge: { component: DpBadge, contract: 'dp', description: '徽标' },
  avatar: { component: DpAvatar, contract: 'dp', description: '头像' },
  divider: { component: DpDivider, contract: 'dp', description: '分割线' },
  card: { component: DpCard, contract: 'dp', description: '卡片（容器）' },
  empty: { component: DpEmpty, contract: 'dp', description: '空状态' },
  // 布局容器
  space: { component: DpSpace, contract: 'dp', description: '间距容器' },
  grid: { component: DpGrid, contract: 'dp', description: '栅格容器' },
  panel: { component: DpPanel, contract: 'dp', description: '面板（容器）' },
  // 数据录入（字段控件）
  input: { component: DpInput, contract: 'dp', valueType: 'string', description: '文本输入' },
  textarea: { component: DpTextarea, contract: 'dp', valueType: 'string', description: '多行文本' },
  number: {
    component: DpInputNumber,
    contract: 'dp',
    valueType: 'number',
    description: '数字输入',
  },
  switch: { component: DpSwitch, contract: 'dp', valueType: 'boolean', description: '开关' },
  checkbox: { component: DpCheckbox, contract: 'dp', valueType: 'boolean', description: '复选框' },
  radio: {
    component: DpRadio,
    contract: 'dp',
    valueType: 'string',
    optionsKey: 'options',
    description: '单选（数据源注入选项）',
  },
  select: {
    component: DpSelect,
    contract: 'dp',
    valueType: 'string',
    optionsKey: 'options',
    description: '下拉选择（数据源注入选项）',
  },
  // 反馈
  spin: { component: DpSpin, contract: 'dp', description: '加载' },
  skeleton: { component: DpSkeleton, contract: 'dp', description: '骨架屏' },
  alert: { component: DpAlert, contract: 'dp', description: '警告' },
}

/** 把 @dp_ui/core 组件注册进 registry（默认 defaultRegistry），返回该 registry */
export function installDpUi(registry: DsRegistry): DsRegistry {
  return registry.registerMany(dpUiComponents)
}
