import type { Component } from "vue";
import { docMenuItems } from "./menu";

const menuOrder = new Map(
    docMenuItems.map((item, index) => [item.path, index]),
);

export interface DemoApiRow {
    name: string;
    type: string;
    def?: string;
    desc: string;
}

export interface DemoApiTable {
    title: string;
    rows: DemoApiRow[];
}

export interface DemoMeta {
    /** 页内锚点 */
    id: string;
    title: string;
    desc?: string;
    /** 相对 docs/demos 的路径，不含 .vue 后缀 */
    file: string;
}

export interface ResolvedDemo extends DemoMeta {
    component: Component;
    source: string;
}

interface RawComponentDoc {
    path: string;
    name: string;
    zh: string;
    group: string;
    desc: string;
    demos: DemoMeta[];
    api?: DemoApiTable[];
}

export interface ComponentDoc extends Omit<RawComponentDoc, "demos"> {
    demos: ResolvedDemo[];
}

const demoModules = import.meta.glob("./demos/**/*.vue", {
    eager: true,
}) as Record<string, { default: Component }>;

const demoSources = import.meta.glob("./demos/**/*.vue", {
    query: "?raw",
    import: "default",
    eager: true,
}) as Record<string, string>;

function resolveDemo(meta: DemoMeta): ResolvedDemo {
    const key = `./demos/${meta.file}.vue`;
    const component = demoModules[key]?.default;
    if (!component) throw new Error(`找不到示例组件：${key}`);
    return { ...meta, component, source: demoSources[key] ?? "" };
}

const rawDocs: RawComponentDoc[] = [
    {
        path: "button",
        name: "Button",
        zh: "按钮",
        group: "通用 General",
        desc: "用于触发一个动作，如提交表单、打开弹窗、开始/停止等。提供六种语义类型、三种尺寸，以及幽灵、纯图标、圆角、块级形态与 loading / disabled 状态。Props 采用 { theme, comp } 契约：外观属性放 theme、行为属性放 comp。",
        demos: [
            {
                id: "button-basic",
                title: "基础用法",
                desc: "按钮的默认形态与主要形态。",
                file: "button/DemoBasic",
            },
            {
                id: "button-variant",
                title: "类型",
                desc: "通过 theme.variant 切换六种语义颜色。",
                file: "button/DemoVariant",
            },
            {
                id: "button-appearance",
                title: "形态",
                desc: "text 纯文字、quaternary 次级、dashed 虚线、circle 圆形、strong 加粗。",
                file: "button/DemoAppearance",
            },
            {
                id: "button-size",
                title: "尺寸",
                desc: "small / medium / large，高度由 --dp-size-btn-h-* 控制。",
                file: "button/DemoSize",
            },
            {
                id: "button-ghost",
                title: "幽灵按钮",
                desc: "theme.ghost 无边框/底色，文字色随 variant。",
                file: "button/DemoGhost",
            },
            {
                id: "button-icon-round",
                title: "图标与圆角",
                desc: "theme.icon 纯图标方形按钮；theme.round 圆形按钮。",
                file: "button/DemoIconRound",
            },
            {
                id: "button-block",
                title: "块级按钮",
                desc: "theme.block 占满整行宽度。",
                file: "button/DemoBlock",
            },
            {
                id: "button-state",
                title: "禁用与加载",
                desc: "comp.disabled 禁用；comp.loading 显示 spinner 并禁用点击。",
                file: "button/DemoState",
            },
            {
                id: "button-events",
                title: "事件与原生 type",
                desc: "点击事件与 comp.nativeType。",
                file: "button/DemoEvents",
            },
        ],
        api: [
            {
                title: "Props · theme（外观）",
                rows: [
                    {
                        name: "variant",
                        type: "'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'",
                        def: "'default'",
                        desc: "颜色语义类型（ghost 时决定文字色）",
                    },
                    {
                        name: "size",
                        type: "'small' | 'medium' | 'large'",
                        def: "'medium'",
                        desc: "尺寸，高度由 --dp-size-btn-h-* 变量控制",
                    },
                    {
                        name: "round",
                        type: "boolean",
                        def: "false",
                        desc: "圆形按钮（rounded-full）",
                    },
                    {
                        name: "ghost",
                        type: "boolean",
                        def: "false",
                        desc: "幽灵按钮：无边框/底色，文字色随 variant",
                    },
                    {
                        name: "icon",
                        type: "boolean",
                        def: "false",
                        desc: "纯图标模式：方形、无内边距，宽高取对应 size 变量",
                    },
                    {
                        name: "block",
                        type: "boolean",
                        def: "false",
                        desc: "块级按钮（width: 100%）",
                    },
                    {
                        name: "cssVars",
                        type: "Record<string, string | number>",
                        def: "-",
                        desc: "CSS 变量覆盖，写入根元素；key 省略 --dp- 前缀自动补齐",
                    },
                ],
            },
            {
                title: "Props · comp（行为）",
                rows: [
                    {
                        name: "loading",
                        type: "boolean",
                        def: "false",
                        desc: "加载中：显示内置 spinner，并禁用点击",
                    },
                    {
                        name: "disabled",
                        type: "boolean",
                        def: "false",
                        desc: "禁用按钮",
                    },
                    {
                        name: "nativeType",
                        type: "'button' | 'submit' | 'reset'",
                        def: "'button'",
                        desc: "原生 <button> 的 type",
                    },
                ],
            },
            {
                title: "Events",
                rows: [
                    {
                        name: "click",
                        type: "(event: MouseEvent) => void",
                        def: "-",
                        desc: "点击时触发（loading / disabled 时不触发）",
                    },
                ],
            },
            {
                title: "Slots",
                rows: [
                    {
                        name: "default",
                        type: "内容",
                        def: "-",
                        desc: "按钮内容（图标 / 文本）；loading 时组件会在其前追加 spinner",
                    },
                ],
            },
        ],
    },
    {
        path: "tag",
        name: "Tag",
        zh: "标签",
        group: "通用 General",
        desc: "标签用于标记内容属性或状态。支持六种语义类型、三种尺寸、圆角与可关闭形态。",
        demos: [
            {
                id: "tag-basic",
                title: "语义类型",
                desc: "通过 theme.variant 切换六种语义颜色。",
                file: "tag/TagBasic",
            },
            {
                id: "tag-closable",
                title: "可关闭与尺寸",
                desc: "comp.closable 显示关闭按钮并触发 close 事件；theme.size 控制尺寸。",
                file: "tag/TagClosable",
            },
            {
                id: "tag-status",
                title: "可选 / 禁用 / 无边框",
                desc: "comp.checkable 配合 v-model:checked；comp.disabled 禁用交互；theme.bordered 控制边框。",
                file: "tag/TagStatus",
            },
        ],
    },
    {
        path: "divider",
        name: "Divider",
        zh: "分割线",
        group: "通用 General",
        desc: "分割线用于区隔内容区块，支持水平 / 垂直、虚线以及带标题的对齐方式。",
        demos: [
            {
                id: "divider-basic",
                title: "基础用法",
                desc: "带标题、虚线以及垂直分割线。",
                file: "divider/DividerBasic",
            },
        ],
    },
    {
        path: "icon",
        name: "Icon",
        zh: "图标",
        group: "通用 General",
        desc: "图标渲染容器，通过 comp.icon 传入 UnoCSS 图标类或自定义 CSS 类，comp.size 控制字号。",
        demos: [
            {
                id: "icon-basic",
                title: "基础用法",
                desc: "用 CSS 类绘制图标，并通过 size 控制尺寸。",
                file: "icon/IconBasic",
            },
        ],
    },
    {
        path: "card",
        name: "Card",
        zh: "卡片",
        group: "通用 General",
        desc: "卡片承载一组相关信息，提供标题区、内边距尺寸与悬停反馈。",
        demos: [
            {
                id: "card-basic",
                title: "基础用法",
                desc: "带标题的卡片容器。",
                file: "card/CardBasic",
            },
            {
                id: "card-hoverable",
                title: "内边距与悬停",
                desc: "comp.padding 控制内边距；comp.hoverable 增加悬停反馈。",
                file: "card/CardHoverable",
            },
            {
                id: "card-slots",
                title: "封面 / 标题栏操作 / 页脚",
                desc: "cover、header-extra、footer 插槽组合出完整卡片结构。",
                file: "card/CardSlots",
            },
        ],
    },
    {
        path: "avatar",
        name: "Avatar",
        zh: "头像",
        group: "通用 General",
        desc: "头像用于展示用户或实体的标识，支持图片、文字回退、尺寸与语义色。",
        demos: [
            {
                id: "avatar-basic",
                title: "尺寸与形态",
                desc: "theme.size / theme.variant / theme.round 组合使用。",
                file: "avatar/AvatarBasic",
            },
        ],
    },
    {
        path: "space",
        name: "Space",
        zh: "间距",
        group: "布局 Layout",
        desc: "为子元素提供统一的水平或垂直间距，支持换行、对齐与主轴分布。",
        demos: [
            {
                id: "space-basic",
                title: "基础用法",
                desc: "水平换行、垂直排列与 space-between 分布。",
                file: "space/SpaceBasic",
            },
        ],
    },
    {
        path: "grid",
        name: "Grid",
        zh: "栅格",
        group: "布局 Layout",
        desc: "等宽栅格布局，通过 comp.cols 与 comp.gap 控制列数与间距。",
        demos: [
            {
                id: "grid-basic",
                title: "基础用法",
                desc: "三列栅格，间距 12px。",
                file: "grid/GridBasic",
            },
        ],
    },
    {
        path: "flex",
        name: "Flex",
        zh: "弹性布局",
        group: "布局 Layout",
        desc: "Flex 布局容器，提供方向、对齐、换行与间距等常用能力。",
        demos: [
            {
                id: "flex-basic",
                title: "基础用法",
                desc: "主轴分布与交叉轴对齐。",
                file: "flex/FlexBasic",
            },
        ],
    },
    {
        path: "tabs",
        name: "Tabs",
        zh: "标签页",
        group: "导航 Navigation",
        desc: "标签页在同一区域内切换多组内容，通过 v-model 绑定当前激活项。",
        demos: [
            {
                id: "tabs-basic",
                title: "基础用法",
                desc: "comp.items 定义标签与内容，v-model 绑定激活值。",
                file: "tabs/TabsBasic",
            },
            {
                id: "tabs-type",
                title: "形态",
                desc: "theme.type 支持 segment / line / card 三种形态。",
                file: "tabs/TabsType",
            },
        ],
    },
    {
        path: "breadcrumb",
        name: "Breadcrumb",
        zh: "面包屑",
        group: "导航 Navigation",
        desc: "面包屑展示当前页面的层级路径，最后一项通常表示当前页面。",
        demos: [
            {
                id: "breadcrumb-basic",
                title: "基础用法",
                desc: "comp.items 定义层级，带 href 的项渲染为链接。",
                file: "breadcrumb/BreadcrumbBasic",
            },
        ],
    },
    {
        path: "steps",
        name: "Steps",
        zh: "步骤条",
        group: "导航 Navigation",
        desc: "步骤条展示流程进度，comp.current 指定当前步骤。",
        demos: [
            {
                id: "steps-basic",
                title: "基础用法",
                desc: "配合按钮切换当前步骤。",
                file: "steps/StepsBasic",
            },
            {
                id: "steps-state",
                title: "垂直 / 失败 / 完成",
                desc: "comp.vertical 切换方向；comp.status 控制整体完成或失败状态。",
                file: "steps/StepsState",
            },
        ],
    },
    {
        path: "pagination",
        name: "Pagination",
        zh: "分页",
        group: "导航 Navigation",
        desc: "分页器用于长列表翻页，comp.total / comp.pageSize 控制页数。",
        demos: [
            {
                id: "pagination-basic",
                title: "基础用法",
                desc: "v-model:current 绑定当前页。",
                file: "pagination/PaginationBasic",
            },
            {
                id: "pagination-ellipsis",
                title: "省略与页码窗口",
                desc: "comp.maxVisible 控制页码窗口大小，超出部分用省略号折叠。",
                file: "pagination/PaginationEllipsis",
            },
        ],
    },
    {
        path: "input",
        name: "Input",
        zh: "输入框",
        group: "数据录入 Data Input",
        desc: "单行文本输入框，支持标签、占位符、清除按钮、密码类型与禁用/只读状态。",
        demos: [
            {
                id: "input-basic",
                title: "基础用法",
                desc: "标签、占位符与清除按钮。",
                file: "input/InputBasic",
            },
            {
                id: "input-state",
                title: "状态",
                desc: "密码类型、禁用与只读。",
                file: "input/InputState",
            },
            {
                id: "input-affix",
                title: "前后缀与字数统计",
                desc: "prefix / suffix 插槽；comp.maxlength 与 comp.showCount 控制长度和计数。",
                file: "input/InputAffix",
            },
        ],
    },
    {
        path: "textarea",
        name: "Textarea",
        zh: "文本域",
        group: "数据录入 Data Input",
        desc: "多行文本输入框，comp.rows 控制行数，comp.resize 控制是否允许拖拽缩放。",
        demos: [
            {
                id: "textarea-basic",
                title: "基础用法",
                desc: "多行输入与禁用缩放。",
                file: "textarea/TextareaBasic",
            },
        ],
    },
    {
        path: "input-number",
        name: "InputNumber",
        zh: "数字输入",
        group: "数据录入 Data Input",
        desc: "数字输入框，支持最小值、最大值与步长限制。",
        demos: [
            {
                id: "input-number-basic",
                title: "基础用法",
                desc: "范围 0 ~ 100，步长 5。",
                file: "input-number/InputNumberBasic",
            },
        ],
    },
    {
        path: "switch",
        name: "Switch",
        zh: "开关",
        group: "数据录入 Data Input",
        desc: "开关用于在两个互斥状态间切换，支持标签、尺寸与禁用状态。",
        demos: [
            {
                id: "switch-basic",
                title: "基础用法",
                desc: "标签、禁用与小尺寸。",
                file: "switch/SwitchBasic",
            },
        ],
    },
    {
        path: "checkbox",
        name: "Checkbox",
        zh: "复选框",
        group: "数据录入 Data Input",
        desc: "复选框用于多项选择或布尔勾选，支持标签与禁用状态。",
        demos: [
            {
                id: "checkbox-basic",
                title: "基础用法",
                desc: "v-model 绑定布尔值。",
                file: "checkbox/CheckboxBasic",
            },
        ],
    },
    {
        path: "radio",
        name: "Radio",
        zh: "单选",
        group: "数据录入 Data Input",
        desc: "单选组在多个选项中选择一个，comp.options 定义选项，comp.vertical 控制排列方向。",
        demos: [
            {
                id: "radio-basic",
                title: "基础用法",
                desc: "水平与垂直排列。",
                file: "radio/RadioBasic",
            },
        ],
    },
    {
        path: "select",
        name: "Select",
        zh: "选择器",
        group: "数据录入 Data Input",
        desc: "下拉选择器，comp.options 定义选项，支持占位符与禁用状态。",
        demos: [
            {
                id: "select-basic",
                title: "基础用法",
                desc: "v-model 绑定选中值。",
                file: "select/SelectBasic",
            },
        ],
    },
    {
        path: "slider",
        name: "Slider",
        zh: "滑块",
        group: "数据录入 Data Input",
        desc: "滑块在连续区间内选择数值，comp.min / comp.max / comp.step 控制范围与步长。",
        demos: [
            {
                id: "slider-basic",
                title: "基础用法",
                desc: "范围 0 ~ 100，步长 5。",
                file: "slider/SliderBasic",
            },
        ],
    },
    {
        path: "toggle",
        name: "Toggle",
        zh: "开关钮",
        group: "数据录入 Data Input",
        desc: "开关钮用于切换单个格式或状态，与 Switch 的区别在于语义与外观更接近工具条按钮。",
        demos: [
            {
                id: "toggle-basic",
                title: "基础用法",
                desc: "默认、选中与禁用状态。",
                file: "toggle/ToggleBasic",
            },
        ],
    },
    {
        path: "tags-input",
        name: "TagsInput",
        zh: "标签输入",
        group: "数据录入 Data Input",
        desc: "标签输入框通过回车或粘贴分隔符添加标签，comp.max 限制最大数量。",
        demos: [
            {
                id: "tags-input-basic",
                title: "基础用法",
                desc: "v-model 绑定标签数组。",
                file: "tags-input/TagsInputBasic",
            },
        ],
    },
    {
        path: "table",
        name: "Table",
        zh: "表格",
        group: "数据展示 Data Display",
        desc: "表格展示结构化数据，支持自定义单元格插槽、斑马纹、边框、加载与空数据状态。",
        demos: [
            {
                id: "table-basic",
                title: "基础用法",
                desc: "列定义、数据与自定义单元格插槽。",
                file: "table/TableBasic",
            },
            {
                id: "table-state",
                title: "空数据与加载",
                desc: "空数据文案与 loading 遮罩。",
                file: "table/TableState",
            },
        ],
    },
    {
        path: "empty",
        name: "Empty",
        zh: "空状态",
        group: "数据展示 Data Display",
        desc: "空状态用于占位无数据场景，支持描述文案、图标插槽与操作区。",
        demos: [
            {
                id: "empty-basic",
                title: "基础用法",
                desc: "默认描述与带操作按钮的空状态。",
                file: "empty/EmptyBasic",
            },
        ],
    },
    {
        path: "accordion",
        name: "Accordion",
        zh: "折叠面板",
        group: "通用 General",
        desc: "折叠面板以手风琴形式展示分组内容，comp.items 定义分组，comp.collapsible 允许全部收起。",
        demos: [
            {
                id: "accordion-basic",
                title: "基础用法",
                desc: "三个分组，允许全部收起。",
                file: "accordion/AccordionBasic",
            },
        ],
    },
    {
        path: "badge",
        name: "Badge",
        zh: "徽标",
        group: "反馈 Feedback",
        desc: "徽标在元素右上角展示计数或红点，comp.max 控制计数上限，comp.color 自定义颜色。",
        demos: [
            {
                id: "badge-basic",
                title: "基础用法",
                desc: "计数、上限、红点与自定义颜色。",
                file: "badge/BadgeBasic",
            },
        ],
    },
    {
        path: "tooltip",
        name: "Tooltip",
        zh: "文字提示",
        group: "反馈 Feedback",
        desc: "文字提示在悬停或聚焦时展示补充说明，comp.side 控制出现方向。",
        demos: [
            {
                id: "tooltip-basic",
                title: "基础用法",
                desc: "四个方向与自定义延迟。",
                file: "tooltip/TooltipBasic",
            },
        ],
    },
    {
        path: "popover",
        name: "Popover",
        zh: "气泡",
        group: "反馈 Feedback",
        desc: "气泡卡片在触发器附近展示更丰富的内容，触发器使用默认插槽、内容使用 content 插槽。",
        demos: [
            {
                id: "popover-basic",
                title: "基础用法",
                desc: "点击触发器打开气泡内容。",
                file: "popover/PopoverBasic",
            },
        ],
    },
    {
        path: "alert",
        name: "Alert",
        zh: "警告",
        group: "反馈 Feedback",
        desc: "警告提示用于展示需要关注的信息，支持四种语义类型、标题与关闭按钮。",
        demos: [
            {
                id: "alert-basic",
                title: "基础用法",
                desc: "语义类型与可关闭形态。",
                file: "alert/AlertBasic",
            },
        ],
    },
    {
        path: "spin",
        name: "Spin",
        zh: "加载",
        group: "反馈 Feedback",
        desc: "加载指示器用于表达进行中的状态，comp.size 控制尺寸。",
        demos: [
            {
                id: "spin-basic",
                title: "基础用法",
                desc: "默认与两种自定义尺寸。",
                file: "spin/SpinBasic",
            },
        ],
    },
    {
        path: "skeleton",
        name: "Skeleton",
        zh: "骨架屏",
        group: "反馈 Feedback",
        desc: "骨架屏在内容加载前占位，comp.variant 支持文本、矩形与圆形。",
        demos: [
            {
                id: "skeleton-basic",
                title: "基础用法",
                desc: "多行文本、矩形与圆形骨架。",
                file: "skeleton/SkeletonBasic",
            },
        ],
    },
    {
        path: "progress",
        name: "Progress",
        zh: "进度",
        group: "反馈 Feedback",
        desc: "进度条展示任务完成百分比，v-model 绑定当前进度，comp.max 控制总量。",
        demos: [
            {
                id: "progress-basic",
                title: "基础用法",
                desc: "通过按钮增减进度。",
                file: "progress/ProgressBasic",
            },
            {
                id: "progress-status",
                title: "环形与状态",
                desc: "theme.type 支持 line / circle；theme.status 切换状态色；showIndicator 显示百分比。",
                file: "progress/ProgressStatus",
            },
        ],
    },
    {
        path: "modal",
        name: "Modal",
        zh: "模态框",
        group: "反馈 Feedback",
        desc: "模态框在当前页面之上展示需要用户确认的内容，通过 v-model:open 控制显隐。",
        demos: [
            {
                id: "modal-basic",
                title: "基础用法",
                desc: "标题、宽度与底部操作区。",
                file: "modal/ModalBasic",
            },
        ],
    },
    {
        path: "auth",
        name: "Auth",
        zh: "权限",
        group: "能力 Capability",
        desc: "权限组件按权限码控制内容显隐，无权限时渲染 fallback 插槽；也可使用 v-auth 指令。",
        demos: [
            {
                id: "auth-basic",
                title: "基础用法",
                desc: "权限码命中、fallback 与 v-auth 指令。",
                file: "auth/AuthBasic",
            },
        ],
    },
    {
        path: "provide",
        name: "Provide",
        zh: "注入",
        group: "能力 Capability",
        desc: "注入组件把 comp.key / comp.value 提供给子树，配合 inject 使用。",
        demos: [
            {
                id: "provide-basic",
                title: "基础用法",
                desc: "向子树注入字符串并在子组件读取。",
                file: "provide/ProvideBasic",
            },
        ],
    },
    {
        path: "lazy",
        name: "Lazy",
        zh: "懒渲染",
        group: "能力 Capability",
        desc: "懒渲染组件在内容进入视口后才渲染，支持预加载距离与延迟时间。",
        demos: [
            {
                id: "lazy-basic",
                title: "基础用法",
                desc: "进入视口立即渲染或延迟渲染。",
                file: "lazy/LazyBasic",
            },
        ],
    },
    {
        path: "config-provider",
        name: "ConfigProvider",
        zh: "配置",
        group: "能力 Capability",
        desc: "配置组件通过 comp.themeOverrides 覆盖子树内的 --dp-* CSS 变量，实现局部主题定制。",
        demos: [
            {
                id: "config-provider-basic",
                title: "主题覆盖",
                desc: "覆盖主色与圆角后，子树内组件自动生效。",
                file: "config-provider/ConfigProviderBasic",
            },
        ],
    },
    {
        path: "page",
        name: "Page",
        zh: "页面容器",
        group: "页面结构 Page Structure",
        desc: "页面容器提供页面级上下文（标题 / 路由 meta），渲染面板停靠位，并通过 Panel Group 管理浮动面板的注册、置顶与状态持久化。",
        demos: [
            {
                id: "page-basic",
                title: "停靠位与浮动面板",
                desc: "comp.anchors 控制停靠位；模板 ref 可调用 bringToFront / getPanel / getPanels。",
                file: "page/PageBasic",
            },
        ],
    },
    {
        path: "panel",
        name: "Panel",
        zh: "面板",
        group: "页面结构 Page Structure",
        desc: "面板用于划分页面功能区域，支持标题、折叠、加载与尺寸；fixed 浮动模式下可停靠、拖动、缩放、显示工具条并持久化位置。",
        demos: [
            {
                id: "panel-basic",
                title: "基础用法",
                desc: "基础面板、可折叠面板与加载状态。",
                file: "panel/PanelBasic",
            },
            {
                id: "panel-floating",
                title: "浮动 / 拖动 / 缩放",
                desc: "fixed + movable + resizable + showTools，配合 DpPage 的停靠位使用。",
                file: "panel/PanelFloating",
            },
        ],
    },
    {
        path: "layout-basic",
        name: "LayoutBasic",
        zh: "基础布局",
        group: "页面结构 Page Structure",
        desc: "基础布局由页头、主体与页脚组成，主体区域自适应剩余高度。",
        demos: [
            {
                id: "layout-basic-basic",
                title: "基础用法",
                desc: "页头 / 主体 / 页脚三段结构。",
                file: "layout-basic/LayoutBasicBasic",
            },
        ],
    },
    {
        path: "layout-sider",
        name: "LayoutSider",
        zh: "侧边布局",
        group: "页面结构 Page Structure",
        desc: "侧边布局在基础布局上增加左侧栏，适用于带导航的应用页面。",
        demos: [
            {
                id: "layout-sider-basic",
                title: "基础用法",
                desc: "左侧栏 + 页头 + 主体。",
                file: "layout-sider/LayoutSiderBasic",
            },
        ],
    },
];

export const componentDocs: ComponentDoc[] = rawDocs
    .map((doc) => ({
        ...doc,
        demos: doc.demos.map(resolveDemo),
    }))
    .sort(
        (a, b) =>
            (menuOrder.get(a.path) ?? Number.MAX_SAFE_INTEGER) -
            (menuOrder.get(b.path) ?? Number.MAX_SAFE_INTEGER),
    );

export const componentDocMap = new Map(
    componentDocs.map((doc) => [doc.path, doc]),
);

export function findComponentDoc(path: string): ComponentDoc | undefined {
    return componentDocMap.get(path);
}

export function hasComponentDoc(path: string): boolean {
    return componentDocMap.has(path);
}

/** 上一个 / 下一个有演示的组件 */
export function getDocNeighbors(path: string) {
    const index = componentDocs.findIndex((doc) => doc.path === path);
    if (index < 0) return {};
    return {
        prev: index > 0 ? componentDocs[index - 1] : undefined,
        next:
            index < componentDocs.length - 1
                ? componentDocs[index + 1]
                : undefined,
    };
}
