import { computed, useAttrs } from 'vue'
import type { ComputedRef } from 'vue'
import type { ClassValue, StyleValue } from 'vue'
import type { DpcProps, DpcThemeProps } from '../types/dpc-props'
import type { DpcSize, DpcType } from '../types'

export interface UseDpcPropsOptions<Comp extends object> {
  /** comp（业务数据）默认值，需为 Comp 全部字段提供默认 */
  compDefaults?: Partial<Comp>
  /** theme（外观数据）默认值 */
  themeDefaults?: Partial<DpcThemeProps>
}

/** 合并默认值后的完整样式数据（关键字段已解析为必填） */
export interface ResolvedDpcStyle {
  class: ClassValue | undefined
  style: StyleValue | undefined
  size: DpcSize
  variant: DpcType
  round: boolean
  block: boolean
  bordered: boolean
  cssVars: Record<string, string | number>
}

export interface UseDpcPropsReturn<Comp extends object> {
  /** 合并默认值后的业务数据（响应式）。Comp 字段定义为必填，运行时由 compDefaults 补齐 */
  comp: ComputedRef<Comp>
  /** 合并默认值后的样式数据（响应式） */
  style: ComputedRef<ResolvedDpcStyle>
  /** 绑定到根元素的属性：透传 attrs + 合并后的 class / style / cssVars */
  rootAttrs: ComputedRef<Record<string, unknown>>
}

/**
 * 统一组件 props：`theme`（外观数据）+ `comp`（组件业务数据）。
 *
 * - 返回 `comp` / `style` 供组件逻辑使用（已合并默认值；style 为内部计算出的外观数据）。
 * - 原生 `style` / `class` 等透传属性会经 rootAttrs 合并到根元素（不再被组件 props 占用）。
 * - 返回 `rootAttrs`，组件在根元素 `v-bind="rootAttrs"`：
 *   自动合并透传的 class/style、theme 的 class/style/cssVars（写入 `--dpc-*`）。
 * - 组件需设置 `defineOptions({ inheritAttrs: false })` 避免自动透传重复。
 */
export function useDpcProps<Comp extends object>(
  props: DpcProps<Comp>,
  options: UseDpcPropsOptions<Comp> = {},
): UseDpcPropsReturn<Comp> {
  const attrs = useAttrs()

  const comp = computed<Comp>(() => ({ ...options.compDefaults, ...props.comp }) as Comp)

  const style = computed<ResolvedDpcStyle>(() => ({
    class: props.theme?.class,
    style: props.theme?.style,
    // 优先级：用户传入 > themeDefaults > 内置默认
    size: props.theme?.size ?? options.themeDefaults?.size ?? 'medium',
    variant: props.theme?.variant ?? options.themeDefaults?.variant ?? 'default',
    round: props.theme?.round ?? options.themeDefaults?.round ?? false,
    block: props.theme?.block ?? options.themeDefaults?.block ?? false,
    bordered: props.theme?.bordered ?? options.themeDefaults?.bordered ?? false,
    cssVars: props.theme?.cssVars ?? options.themeDefaults?.cssVars ?? {},
  }))

  const rootAttrs = computed<Record<string, unknown>>(() => {
    const { class: attrClass, style: attrStyle, ...rest } = attrs
    const s = style.value

    const classList: unknown[] = []
    if (attrClass != null) classList.push(attrClass)
    if (s.class != null) classList.push(s.class)

    const styleList: unknown[] = []
    if (attrStyle != null) styleList.push(attrStyle)
    if (s.style != null) styleList.push(s.style)
    const cssVars = normalizeCssVars(s.cssVars)
    if (Object.keys(cssVars).length > 0) styleList.push(cssVars)

    return {
      ...rest,
      ...(classList.length > 0 ? { class: classList } : {}),
      ...(styleList.length > 0 ? { style: styleList } : {}),
    }
  })

  return { comp, style, rootAttrs }
}

/** key 省略 `--dpc-` 前缀时自动补齐 */
function normalizeCssVars(vars: Record<string, string | number>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(vars)) {
    result[key.startsWith('--') ? key : `--dpc-${key}`] = String(value)
  }
  return result
}
