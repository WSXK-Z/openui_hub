import { defineComponent, h, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { DsRegistry } from '../../types/registry'
import DsForm from '../DsForm.vue'
import DsSchema from '../DsSchema.vue'

/** 轻量 fake：原生 input（native 契约） */
const FakeInput = defineComponent({
  name: 'FakeInput',
  props: {
    modelValue: { type: [String, Number], default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        'data-test': 'fake-input',
        value: props.modelValue,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      })
  },
})

/** 轻量 fake：接收 options 的“选择类”（校验 optionsKey 注入） */
const FakeOptionsInput = defineComponent({
  name: 'FakeOptionsInput',
  props: {
    modelValue: { type: [String, Number], default: '' },
    options: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const onPick = (e: Event) => emit('update:modelValue', (e.target as HTMLSelectElement).value)
    return () =>
      h(
        'select',
        {
          'data-test': 'fake-select',
          value: props.modelValue,
          onChange: onPick,
          onInput: onPick,
        },
        (props.options as Array<{ label: string; value: string | number }>).map((opt) =>
          h('option', { value: String(opt.value) }, opt.label),
        ),
      )
  },
})

function makeRegistry() {
  return new DsRegistry().registerMany({
    input: { component: FakeInput, contract: 'native', valueType: 'string' },
    select: {
      component: FakeOptionsInput,
      contract: 'native',
      valueType: 'string',
      optionsKey: 'options',
    },
  })
}

describe('DsForm（数据驱动绑定 / 选项 / 校验 / 显隐）', () => {
  it('字段绑定写入 model', async () => {
    const model = reactive<Record<string, unknown>>({ name: '' })
    const wrapper = mount(DsForm, {
      props: {
        fields: [{ component: 'input', field: 'name' }],
        model,
        registry: makeRegistry(),
      },
    })
    const input = wrapper.find('[data-test="fake-input"]')
    await input.setValue('Ada')
    expect(model['name']).toBe('Ada')
  })

  it('dataSource 静态选项注入 optionsKey', async () => {
    const model = reactive<Record<string, unknown>>({ city: '' })
    const wrapper = mount(DsForm, {
      props: {
        fields: [
          {
            component: 'select',
            field: 'city',
            dataSource: {
              options: [
                { label: '北京', value: 'bj' },
                { label: '上海', value: 'sh' },
              ],
            },
          },
        ],
        model,
        registry: makeRegistry(),
      },
    })
    const options = wrapper.findAll('option')
    expect(options.map((o) => o.text())).toEqual(['北京', '上海'])
    await options[1]!.setValue()
    expect(model['city']).toBe('sh')
  })

  it('visible 条件控制字段渲染', async () => {
    const model = reactive<Record<string, unknown>>({ open: true, name: '' })
    const fields = [
      { component: 'input', field: 'name', label: '姓名' },
      {
        component: 'input',
        field: 'extra',
        visible: ({ model: m }: { model: Record<string, unknown> }) => m.open === true,
      },
    ]
    const wrapper = mount(DsForm, {
      props: { fields, model, registry: makeRegistry() },
    })
    expect(wrapper.findAll('[data-test="fake-input"]').length).toBe(2)
    model.open = false
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[data-test="fake-input"]').length).toBe(1)
  })

  it('validate 触发必填错误并在字段下方展示', async () => {
    const model = reactive<Record<string, unknown>>({ name: '' })
    const fields = [
      { component: 'input', field: 'name', label: '姓名', rules: [{ required: true, message: '请填写姓名' }] },
    ]
    const wrapper = mount(DsForm, {
      props: { fields, model, registry: makeRegistry() },
    })
    const vm = wrapper.vm as unknown as { validate: () => Promise<boolean> }
    const valid = await vm.validate()
    expect(valid).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('请填写姓名')
    expect(wrapper.find('.ds-field__error').exists()).toBe(true)
  })
})

describe('DsSchema（数组 schema 渲染 / 容器递归）', () => {
  it('渲染数组 schema，字段绑定 model', async () => {
    const model = reactive<Record<string, unknown>>({ name: '' })
    const wrapper = mount(DsSchema, {
      props: {
        schema: [
          { component: 'input', field: 'name', label: '姓名' },
          { component: 'input', field: 'nick' },
        ],
        model,
        registry: makeRegistry(),
      },
    })
    expect(wrapper.findAll('[data-test="fake-input"]').length).toBe(2)
    await wrapper.find('[data-test="fake-input"]').setValue('Bob')
    expect(model['name']).toBe('Bob')
  })
})
