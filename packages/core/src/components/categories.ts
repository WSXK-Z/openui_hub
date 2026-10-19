/**
 * 组件分类元数据（参照 Naive UI 的组件分类方式）。
 *
 * 目录结构与分类保持一致：common / data-entry / data-display / navigation /
 * feedback / layout 以及能力类（auth / provide / lazy / config）；
 * Page / Panel / Layout* 属于页面结构。
 */
export type DpComponentCategoryKey =
    | 'common'
    | 'data-input'
    | 'data-display'
    | 'navigation'
    | 'feedback'
    | 'layout'
    | 'capability'
    | 'page-structure'

export interface DpComponentCategory {
    key: DpComponentCategoryKey
    /** 英文分类名（与 Naive UI 文档一致） */
    label: string
    /** 中文分类名 */
    labelZh: string
    /** 该分类下的组件名（Dp 前缀） */
    components: readonly string[]
    /** 对应的源码目录（页面结构组件位于 src/page、src/panel） */
    directory: string
}

export const dpComponentCategories: readonly DpComponentCategory[] = [
    {
        key: 'common',
        label: 'Common',
        labelZh: '通用',
        directory: 'src/components/common',
        components: ['DpAvatar', 'DpButton', 'DpCard', 'DpAccordion', 'DpDivider', 'DpIcon', 'DpTag'],
    },
    {
        key: 'data-input',
        label: 'Data Input',
        labelZh: '数据录入',
        directory: 'src/components/data-entry',
        components: [
            'DpCheckbox',
            'DpInput',
            'DpInputNumber',
            'DpRadio',
            'DpSelect',
            'DpSlider',
            'DpSwitch',
            'DpTagsInput',
            'DpTextarea',
            'DpToggle',
        ],
    },
    {
        key: 'data-display',
        label: 'Data Display',
        labelZh: '数据展示',
        directory: 'src/components/data-display',
        components: ['DpEmpty', 'DpTable'],
    },
    {
        key: 'navigation',
        label: 'Navigation',
        labelZh: '导航',
        directory: 'src/components/navigation',
        components: ['DpBreadcrumb', 'DpPagination', 'DpSteps', 'DpTabs'],
    },
    {
        key: 'feedback',
        label: 'Feedback',
        labelZh: '反馈',
        directory: 'src/components/feedback',
        components: [
            'DpAlert',
            'DpBadge',
            'DpModal',
            'DpPopover',
            'DpProgress',
            'DpSkeleton',
            'DpSpin',
            'DpTooltip',
        ],
    },
    {
        key: 'layout',
        label: 'Layout',
        labelZh: '布局',
        directory: 'src/components/layout',
        components: ['DpFlex', 'DpGrid', 'DpSpace'],
    },
    {
        key: 'capability',
        label: 'Capability',
        labelZh: '能力',
        directory: 'src/components',
        components: ['DpAuth', 'DpConfigProvider', 'DpLazy', 'DpProvide'],
    },
    {
        key: 'page-structure',
        label: 'Page Structure',
        labelZh: '页面结构',
        directory: 'src/page',
        components: ['DpLayoutBasic', 'DpLayoutSider', 'DpPage', 'DpPanel'],
    },
]

/** 组件名 → 分类 */
export const dpComponentCategoryMap = new Map<string, DpComponentCategory>(
    dpComponentCategories.flatMap((category) =>
        category.components.map((name) => [name, category] as const),
    ),
)

export function findComponentCategory(name: string): DpComponentCategory | undefined {
    return dpComponentCategoryMap.get(name)
}
