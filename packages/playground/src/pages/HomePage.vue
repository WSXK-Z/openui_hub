<script setup lang="ts">
import { ref } from 'vue'
import { setAuthCodes } from '@dp_ui/core'
import PageInfo from '../components/PageInfo.vue'

// 模块级权限码表（v-auth / DpAuth 无注入上下文时的回退）
setAuthCodes(['dashboard:view', 'user:edit'])

const clickCount = ref(0)
</script>

<template>
  <DpLayoutBasic>
    <template #header>
      <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 48px;
        ">
        <strong>@dp_ui/core · 全量加载演示</strong>
        <DpBadge :comp="{ value: clickCount }">
          <DpButton :theme="{ size: 'small' }">徽标</DpButton>
        </DpBadge>
      </div>
    </template>

    <DpPage :comp="{ title: '首页' }">
      <DpSpace :comp="{ direction: 'vertical', size: 'large' }" style="width: 100%">
        <DpPanel :comp="{ title: '基础组件（common / layout / feedback）' }">
          <DpSpace :comp="{ wrap: true }">
            <DpButton :theme="{ variant: 'primary' }" @click="clickCount++">主要按钮</DpButton>
            <DpButton :theme="{ variant: 'success' }">成功</DpButton>
            <DpButton :theme="{ variant: 'warning' }">警告</DpButton>
            <DpButton :theme="{ variant: 'danger' }">危险</DpButton>
            <DpButton :theme="{ variant: 'info' }">信息</DpButton>
            <DpButton :theme="{ round: true }">圆角</DpButton>
            <DpButton :comp="{ loading: true }">加载中</DpButton>
            <DpButton :comp="{ disabled: true }">禁用</DpButton>
            <DpButton :theme="{ size: 'small' }">小号</DpButton>
            <DpButton :theme="{ size: 'large' }">大号</DpButton>
          </DpSpace>

          <DpDivider :comp="{ orientation: 'left' }">标签与徽标</DpDivider>
          <DpSpace :comp="{ wrap: true }">
            <DpTag :theme="{ variant: 'primary' }">primary</DpTag>
            <DpTag :theme="{ variant: 'success' }" :comp="{ closable: true }">success</DpTag>
            <DpTag :theme="{ variant: 'warning', round: true }">warning</DpTag>
            <DpTag :theme="{ variant: 'danger' }">danger</DpTag>
            <DpBadge :comp="{ value: 5 }">
              <DpButton :theme="{ size: 'small' }">消息</DpButton>
            </DpBadge>
            <DpBadge :comp="{ dot: true }">
              <DpButton :theme="{ size: 'small' }">通知</DpButton>
            </DpBadge>
          </DpSpace>

          <DpDivider :comp="{ orientation: 'left' }">提示（基于 reka-ui 原语封装）</DpDivider>
          <DpTooltip :comp="{ content: '这是 Tooltip 内容（TooltipRoot/Trigger/Content）' }">
            <DpButton :theme="{ size: 'small' }">Hover 我</DpButton>
          </DpTooltip>
        </DpPanel>

        <DpPanel :comp="{ title: '能力组件（权限 / 延迟渲染）', collapsible: true }">
          <DpSpace :comp="{ wrap: true }">
            <DpAuth :comp="{ code: 'dashboard:view' }">
              <DpTag :theme="{ variant: 'primary' }">有权限：dashboard:view</DpTag>
            </DpAuth>
            <DpAuth :comp="{ code: 'no-such-code' }">
              <DpTag :theme="{ variant: 'success' }">不应显示</DpTag>
              <template #fallback>
                <DpTag :theme="{ variant: 'danger' }">无权限 fallback</DpTag>
              </template>
            </DpAuth>
            <DpButton v-auth="'user:edit'" :theme="{ variant: 'success' }">v-auth 指令（有权限）</DpButton>
          </DpSpace>

          <DpDivider :comp="{ orientation: 'left' }">DpLazy 延迟渲染（进入视口才渲染）</DpDivider>
          <DpLazy :comp="{ delay: 200 }">
            <DpTag :theme="{ variant: 'info' }">已进入视口并渲染 ✅</DpTag>
          </DpLazy>
        </DpPanel>

        <DpConfigProvider :comp="{ themeOverrides: { 'color-primary': '#7c3aed' } }">
          <DpPanel :comp="{ title: '主题覆盖（DpConfigProvider → --dp-* CSS 变量）' }">
            <DpSpace :comp="{ wrap: true }">
              <DpButton :theme="{ variant: 'primary' }">紫色主题按钮</DpButton>
              <DpButton :theme="{ variant: 'primary', round: true }">紫色圆角</DpButton>
              <DpButton :theme="{
                variant: 'primary',
                cssVars: { radius: '12px', 'color-primary': '#0891b2' },
              }">
                内联 style 覆盖（CSS 变量）
              </DpButton>
            </DpSpace>
            <div style="margin-top: 12px">
              <PageInfo />
            </div>
          </DpPanel>
        </DpConfigProvider>
      </DpSpace>
    </DpPage>
  </DpLayoutBasic>
</template>
