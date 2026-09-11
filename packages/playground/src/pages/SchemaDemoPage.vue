<script setup lang="ts">
import { reactive, ref } from 'vue'
import { DsForm, DsSchema, defaultRegistry, installDpUi } from '@dp_ui/schema'
import type { DsNode, DsSchemaInput, DsEvalCtx } from '@dp_ui/schema'
import PageInfo from '../components/PageInfo.vue'

// 一次性注册 @dp_ui/core 组件为 schema 渲染目标（演示页独立注册；真实项目通常在入口调用）
installDpUi(defaultRegistry)

/* ============ 表单驱动示例 ============ */
const formModel = reactive<Record<string, unknown>>({
  name: '',
  age: undefined,
  city: '',
  vip: false,
  remark: '',
})

const formFields: DsNode[] = [
  {
    component: 'input',
    field: 'name',
    label: '姓名',
    style: { size: 'large' },
    props: { placeholder: '请输入姓名' },
    rules: [{ required: true, message: '姓名必填' }],
  },
  {
    component: 'number',
    field: 'age',
    label: '年龄',
    valueType: 'number',
    props: { min: 0, max: 120 },
  },
  {
    component: 'select',
    field: 'city',
    label: '城市',
    style: { span: 2 },
    dataSource: {
      options: [
        { label: '北京', value: 'beijing' },
        { label: '上海', value: 'shanghai' },
        { label: '深圳', value: 'shenzhen' },
      ],
    },
  },
  {
    component: 'switch',
    field: 'vip',
    label: '会员',
    valueType: 'boolean',
    visible: ({ model }: DsEvalCtx) => (model['city'] as string) !== '',
  },
  {
    component: 'textarea',
    field: 'remark',
    label: '备注',
    style: { span: 2, full: true },
    props: { rows: 3, placeholder: '补充说明' },
  },
]

const submitResult = ref('')
const formValid = ref<boolean | null>(null)
interface DsFormApi {
  validate: () => Promise<boolean>
  submit: () => Promise<boolean>
  clearErrors: () => void
}
const formApi = ref<DsFormApi | null>(null)

async function onFormSubmit(model: Record<string, unknown>) {
  submitResult.value = JSON.stringify(model, null, 2)
}

/* ============ 整页 schema（容器 + 字段递归）示例 ============ */
const pageModel = reactive<Record<string, unknown>>({ query: '', mode: 'list' })
const pageSchema: DsSchemaInput = [
  {
    component: 'panel',
    props: { title: '查询区' },
    key: 'query-panel',
    children: [
      {
        component: 'input',
        field: 'query',
        label: '关键词',
        props: { placeholder: '搜索' },
      },
      {
        component: 'select',
        field: 'mode',
        label: '模式',
        dataSource: {
          options: [
            { label: '列表', value: 'list' },
            { label: '看板', value: 'board' },
          ],
        },
      },
      {
        component: 'button',
        text: '搜索',
        style: { variant: 'primary' },
        props: {
          onClick: () => (pageModel['mode'] = pageModel['mode'] === 'list' ? 'board' : 'list'),
        },
        visible: (ctx: DsEvalCtx) => (ctx.model['query'] as string).length > 0,
      },
    ],
  },
  {
    component: 'alert',
    props: { title: '提示：搜索后点“搜索”切换 列表/看板' },
    style: { variant: 'info' },
    visible: (ctx: DsEvalCtx) => Boolean(ctx.model['mode']),
    key: 'hint',
  },
]
</script>

<template>
  <DpLayoutBasic>
    <DpPage :comp="{ title: '@dp_ui/schema · 数据驱动演示' }">
      <DpSpace :comp="{ direction: 'vertical', size: 'large' }" style="width: 100%">
        <PageInfo title="@dp_ui/schema — 数据驱动 UI 编排层"
          description="schema 元数据决定结构/样式；field 绑定 model、dataSource 提供交互数据、visible 联动、rules 校验。" />

        <DpPanel :comp="{ title: '表单驱动（DsForm）', collapsible: true }">
          <DsForm ref="formApi" :model="formModel" :fields="formFields" :columns="2" @submit="onFormSubmit" />
          <DpSpace :comp="{ size: 'medium' }" style="margin-top: 12px">
            <DpButton :theme="{ variant: 'primary' }" @click="formApi?.validate()">校验</DpButton>
            <DpButton @click="formApi?.submit?.()">提交（先校验）</DpButton>
          </DpSpace>
          <pre v-if="submitResult" class="schema-demo-result">{{ submitResult }}</pre>
        </DpPanel>

        <DpPanel :comp="{ title: '整页 schema 递归（DsSchema）', collapsible: true }">
          <DsSchema :model="pageModel" :schema="pageSchema" />
          <p class="schema-demo-model">当前 model：{{ JSON.stringify(pageModel) }}</p>
        </DpPanel>
      </DpSpace>
    </DpPage>
  </DpLayoutBasic>
</template>

<style scoped>
.schema-demo-result {
  margin-top: 12px;
  padding: 12px;
  border-radius: var(--dp-radius, 6px);
  background: color-mix(in srgb, var(--dp-color-border, #e5e7eb) 40%, transparent);
  font-size: 13px;
}

.schema-demo-model {
  margin-top: 12px;
  font-size: 13px;
  color: var(--dp-color-text-secondary, #6b7280);
}
</style>
