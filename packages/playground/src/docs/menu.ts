/**
 * 组件文档左侧目录（与 @dp_ui/core 的分类元数据保持一致，参照 Naive UI）。
 * 每项对应一个文档页路由 /docs/<path>。
 */
export interface DocMenuItem {
    /** 组件英文名（展示，如 Button） */
    name: string;
    /** 中文名 */
    zh: string;
    /** 文档页路径片段 */
    path: string;
}

export interface DocMenuGroup {
    label: string;
    items: DocMenuItem[];
}

export const docMenuGroups: DocMenuGroup[] = [
    {
        label: "通用 General",
        items: [
            { name: "Avatar", zh: "头像", path: "avatar" },
            { name: "Button", zh: "按钮", path: "button" },
            { name: "Card", zh: "卡片", path: "card" },
            { name: "Accordion", zh: "折叠面板", path: "accordion" },
            { name: "Divider", zh: "分割线", path: "divider" },
            { name: "Icon", zh: "图标", path: "icon" },
            { name: "Tag", zh: "标签", path: "tag" },
        ],
    },
    {
        label: "数据录入 Data Input",
        items: [
            { name: "Checkbox", zh: "复选框", path: "checkbox" },
            { name: "Input", zh: "输入框", path: "input" },
            { name: "InputNumber", zh: "数字输入", path: "input-number" },
            { name: "Radio", zh: "单选", path: "radio" },
            { name: "Select", zh: "选择器", path: "select" },
            { name: "Slider", zh: "滑块", path: "slider" },
            { name: "Switch", zh: "开关", path: "switch" },
            { name: "TagsInput", zh: "标签输入", path: "tags-input" },
            { name: "Textarea", zh: "文本域", path: "textarea" },
            { name: "Toggle", zh: "开关钮", path: "toggle" },
        ],
    },
    {
        label: "数据展示 Data Display",
        items: [
            { name: "Empty", zh: "空状态", path: "empty" },
            { name: "Table", zh: "表格", path: "table" },
        ],
    },
    {
        label: "导航 Navigation",
        items: [
            { name: "Breadcrumb", zh: "面包屑", path: "breadcrumb" },
            { name: "Pagination", zh: "分页", path: "pagination" },
            { name: "Steps", zh: "步骤条", path: "steps" },
            { name: "Tabs", zh: "标签页", path: "tabs" },
        ],
    },
    {
        label: "反馈 Feedback",
        items: [
            { name: "Alert", zh: "警告", path: "alert" },
            { name: "Badge", zh: "徽标", path: "badge" },
            { name: "Modal", zh: "模态框", path: "modal" },
            { name: "Popover", zh: "气泡", path: "popover" },
            { name: "Progress", zh: "进度", path: "progress" },
            { name: "Skeleton", zh: "骨架屏", path: "skeleton" },
            { name: "Spin", zh: "加载", path: "spin" },
            { name: "Tooltip", zh: "文字提示", path: "tooltip" },
        ],
    },
    {
        label: "布局 Layout",
        items: [
            { name: "Flex", zh: "弹性布局", path: "flex" },
            { name: "Grid", zh: "栅格", path: "grid" },
            { name: "Space", zh: "间距", path: "space" },
        ],
    },
    {
        label: "能力 Capability",
        items: [
            { name: "Auth", zh: "权限", path: "auth" },
            { name: "ConfigProvider", zh: "配置", path: "config-provider" },
            { name: "Lazy", zh: "懒渲染", path: "lazy" },
            { name: "Provide", zh: "注入", path: "provide" },
        ],
    },
    {
        label: "主题 Theme",
        items: [
            { name: "ThemeProvider", zh: "主题提供器", path: "theme-provider" },
            { name: "ThemeSwitch", zh: "主题切换", path: "theme-switch" },
            { name: "ThemeToggle", zh: "主题开关", path: "theme-toggle" },
        ],
    },
    {
        label: "页面结构 Page Structure",
        items: [
            { name: "LayoutBasic", zh: "基础布局", path: "layout-basic" },
            { name: "LayoutSider", zh: "侧边布局", path: "layout-sider" },
            { name: "Page", zh: "页面容器", path: "page" },
            { name: "Panel", zh: "面板", path: "panel" },
        ],
    },
];

export const docMenuItems: DocMenuItem[] = docMenuGroups.flatMap((g) => g.items);

/** 根据文档页路径片段查找菜单项 */
export function findDocItem(path: string): DocMenuItem | undefined {
    return docMenuItems.find((item) => item.path === path);
}

/** 路径片段 → Dp 前缀组件名（如 input-number → DpInputNumber） */
export function toDpName(path: string): string {
    const name = findDocItem(path)?.name ?? path;
    return `Dp${name}`;
}
