<script setup lang="ts">
import { ref } from 'vue'

const tableColumns = [
    { key: 'name', title: '姓名' },
    { key: 'role', title: '角色' },
    { key: 'age', title: '年龄', align: 'right' },
]
const tableData = [
    { name: '张三', role: '管理员', age: 28 },
    { name: '李四', role: '编辑', age: 24 },
    { name: '王五', role: '访客', age: 31 },
]

const inputVal = ref('')
const textareaVal = ref('')
const numVal = ref(5)
const switchOn = ref(true)
const checkboxOn = ref(true)
const radioVal = ref('a')
const selectVal = ref('1')

const tabs = [
    { label: '标签一', value: 't1', content: '标签一的内容' },
    { label: '标签二', value: 't2', content: '标签二的内容' },
]
const tabVal = ref('t1')

const breadcrumbItems = [
    { label: '首页', href: '/' },
    { label: '组件大全', href: '/components' },
    { label: '当前页' },
]
const steps = [
    { title: '填写信息', description: '第一步' },
    { title: '提交审核', description: '第二步' },
    { title: '完成', description: '第三步' },
]
const currentStep = ref(1)
const page = ref(1)
const progress = ref(60)
const modalOpen = ref(false)
const sliderVal = ref(40)
const tagsVal = ref(['vue', 'typescript'])
const accordionItems = [
    { value: 'a', title: '什么是 @dp_ui/core？', content: '基于 reka-ui + UnoCSS 的页面级 Vue 组件库。' },
    { value: 'b', title: '为什么拆 theme / comp？', content: '外观与行为分离，便于默认值与主题覆盖。' },
]
</script>

<template>
    <DpLayoutBasic>
        <template #header>
            <div style="display: flex; align-items: center; padding: 0 16px; height: 48px">
                <strong>@dp_ui/core · 组件大全</strong>
            </div>
        </template>

        <DpPage :comp="{ title: '组件大全' }">
            <DpSpace :comp="{ direction: 'vertical', size: 'large' }" style="width: 100%">
                <DpPanel :comp="{ title: '数据展示：表格 / 空状态' }">
                    <DpTable :comp="{ columns: tableColumns, data: tableData, striped: true }"
                        :theme="{ bordered: true }">
                        <template #td-role="{ row }">
                            <DpTag :theme="{ variant: row.role === '管理员' ? 'primary' : 'default' }">
                                {{ row.role }}
                            </DpTag>
                        </template>
                    </DpTable>
                    <DpDivider :comp="{ orientation: 'left' }">空状态</DpDivider>
                    <DpEmpty :comp="{ description: '暂无数据' }" />
                </DpPanel>

                <DpPanel :comp="{ title: '数据录入' }">
                    <DpGrid :comp="{ cols: 2, gap: 16 }">
                        <DpInput v-model="inputVal" :comp="{ label: '用户名', placeholder: '请输入', clearable: true }" />
                        <DpInputNumber v-model="numVal" :comp="{ min: 0, max: 100 }" />
                        <DpTextarea v-model="textareaVal" :comp="{ label: '备注', rows: 3 }" />
                        <DpSpace>
                            <DpSwitch v-model="switchOn" :comp="{ label: '开关' }" />
                            <DpCheckbox v-model="checkboxOn" :comp="{ label: '复选框' }" />
                        </DpSpace>
                    </DpGrid>
                    <DpDivider :comp="{ orientation: 'left' }">单选框 / 下拉框</DpDivider>
                    <DpSpace :comp="{ align: 'start', direction: 'vertical' }" style="width: 100%">
                        <DpRadio v-model="radioVal" :comp="{
                            options: [
                                { label: '选项A', value: 'a' },
                                { label: '选项B', value: 'b' },
                            ],
                        }" />
                        <div style="width: 200px">
                            <DpSelect v-model="selectVal" :comp="{
                                options: [
                                    { label: '苹果', value: '1' },
                                    { label: '香蕉', value: '2' },
                                    { label: '橙子', value: '3' },
                                ],
                            }" />
                        </div>
                    </DpSpace>
                </DpPanel>

                <DpPanel :comp="{ title: '导航' }">
                    <DpBreadcrumb :comp="{ items: breadcrumbItems }" />
                    <DpDivider :comp="{ orientation: 'left' }">步骤条</DpDivider>
                    <DpSteps :comp="{ steps, current: currentStep }" />
                    <DpDivider :comp="{ orientation: 'left' }">分页</DpDivider>
                    <DpPagination v-model:current="page" :comp="{ total: 56, pageSize: 10 }" />
                    <DpDivider :comp="{ orientation: 'left' }">标签页（reka-ui）</DpDivider>
                    <DpTabs v-model="tabVal" :comp="{ items: tabs }" />
                </DpPanel>

                <DpPanel :comp="{ title: '反馈' }">
                    <DpSpace :comp="{ direction: 'vertical' }" style="width: 100%">
                        <DpAlert :theme="{ variant: 'info' }" :comp="{ title: '提示' }">这是一条提示信息</DpAlert>
                        <DpAlert :theme="{ variant: 'success' }" :comp="{ title: '成功', closable: true }">操作已成功</DpAlert>
                        <DpAlert :theme="{ variant: 'warning' }" :comp="{ title: '警告' }">请注意风险</DpAlert>
                        <DpAlert :theme="{ variant: 'danger' }" :comp="{ title: '错误' }">发生错误</DpAlert>
                    </DpSpace>
                    <DpDivider :comp="{ orientation: 'left' }">进度 / 骨架屏 / 加载</DpDivider>
                    <DpSpace :comp="{ direction: 'vertical' }" style="width: 100%">
                        <DpProgress v-model="progress" />
                        <DpSkeleton :comp="{ rows: 2 }" />
                        <DpSpace>
                            <DpSpin />
                            <DpSpin :comp="{ size: 16 }" />
                        </DpSpace>
                    </DpSpace>
                    <DpDivider :comp="{ orientation: 'left' }">模态框（reka-ui）</DpDivider>
                    <DpButton :theme="{ variant: 'primary' }" @click="modalOpen = true">打开模态框</DpButton>
                    <DpModal v-model:open="modalOpen" :comp="{ title: '确认', width: 420 }">
                        <p>是否确认该操作？</p>
                        <template #footer>
                            <DpButton @click="modalOpen = false">取消</DpButton>
                            <DpButton :theme="{ variant: 'primary' }" @click="modalOpen = false">确定</DpButton>
                        </template>
                    </DpModal>
                </DpPanel>

                <DpPanel :comp="{ title: '通用 / 布局' }">
                    <DpSpace>
                        <DpCard :comp="{ title: '卡片', hoverable: true }" style="width: 200px">
                            <p class="text-sm text-[var(--dp-color-text-secondary)]">卡片内容</p>
                        </DpCard>
                        <DpAvatar :comp="{ alt: '张三' }" />
                        <DpAvatar :theme="{ size: 'small' }" :comp="{ alt: 'A' }" />
                        <DpAvatar :theme="{ size: 'large' }" :comp="{ alt: '大' }" />
                    </DpSpace>
                    <DpDivider :comp="{ orientation: 'left' }">栅格 / 弹性布局</DpDivider>
                    <DpGrid :comp="{ cols: 3, gap: 12 }">
                        <div v-for="n in 3" :key="n"
                            class="rounded-[var(--dp-radius)] bg-[color-mix(in_srgb,var(--dp-color-border)_40%,transparent)] p-4 text-center">
                            栅格 {{ n }}
                        </div>
                    </DpGrid>
                    <DpFlex :comp="{ gap: 12, justify: 'space-between' }" style="margin-top: 12px">
                        <span v-for="n in 4" :key="n"
                            class="rounded-[var(--dp-radius-sm)] border border-[var(--dp-color-border)] px-3 py-1">
                            Flex {{ n }}
                        </span>
                    </DpFlex>
                </DpPanel>

                <DpPanel :comp="{ title: 'reka-ui 无头：滑块 / 开关 / 标签输入 / 折叠面板' }">
                    <DpSpace :comp="{ direction: 'vertical' }" style="width: 100%">
                        <div class="flex items-center gap-3">
                            <span class="w-12 shrink-0 text-sm text-[var(--dp-color-text-secondary)]">滑块</span>
                            <DpSlider v-model="sliderVal" :comp="{ min: 0, max: 100, step: 5 }"
                                style="max-width: 240px" />
                            <span class="text-sm text-[var(--dp-color-text-secondary)]">{{ sliderVal }}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="w-12 shrink-0 text-sm text-[var(--dp-color-text-secondary)]">开关钮</span>
                            <DpToggle>加粗</DpToggle>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="w-12 shrink-0 text-sm text-[var(--dp-color-text-secondary)]">标签</span>
                            <DpTagsInput v-model="tagsVal" :comp="{ placeholder: '回车添加，如 tailwind' }"
                                style="max-width: 320px" />
                        </div>
                        <DpAccordion :comp="{ items: accordionItems }" style="max-width: 480px" />
                    </DpSpace>
                </DpPanel>
            </DpSpace>
        </DpPage>
    </DpLayoutBasic>
</template>
