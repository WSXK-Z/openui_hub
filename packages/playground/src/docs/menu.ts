/**
 * 组件文档左侧目录（参照 Naive UI 文档站的分类组织）。
 * 每项对应一个文档页路由 /docs/<path>。
 */
export interface DocMenuItem {
  /** 组件英文名（展示，如 Button） */
  name: string;
  /** 中文名 */
  zh: string;
  /** 文档页路径片段 */
  path: string;
  /** 是否已有独立文档页（未实现时落到通用占位页） */
  implemented: boolean;
}

export interface DocMenuGroup {
  label: string;
  items: DocMenuItem[];
}

export const docMenuGroups: DocMenuGroup[] = [
  {
    label: "通用 General",
    items: [
      { name: "Button", zh: "按钮", path: "button", implemented: true },
      { name: "Icon", zh: "图标", path: "icon", implemented: false },
      { name: "Tag", zh: "标签", path: "tag", implemented: false },
      { name: "Divider", zh: "分割线", path: "divider", implemented: false },
      { name: "Card", zh: "卡片", path: "card", implemented: false },
      { name: "Avatar", zh: "头像", path: "avatar", implemented: false },
    ],
  },
  {
    label: "布局 Layout",
    items: [
      { name: "Space", zh: "间距", path: "space", implemented: false },
      { name: "Grid", zh: "栅格", path: "grid", implemented: false },
      { name: "Flex", zh: "弹性布局", path: "flex", implemented: false },
    ],
  },
  {
    label: "导航 Navigation",
    items: [
      { name: "Tabs", zh: "标签页", path: "tabs", implemented: false },
      { name: "Breadcrumb", zh: "面包屑", path: "breadcrumb", implemented: false },
      { name: "Steps", zh: "步骤条", path: "steps", implemented: false },
      { name: "Pagination", zh: "分页", path: "pagination", implemented: false },
    ],
  },
  {
    label: "数据录入 Data Input",
    items: [
      { name: "Input", zh: "输入框", path: "input", implemented: false },
      { name: "Textarea", zh: "文本域", path: "textarea", implemented: false },
      { name: "InputNumber", zh: "数字输入", path: "input-number", implemented: false },
      { name: "Switch", zh: "开关", path: "switch", implemented: false },
      { name: "Checkbox", zh: "复选框", path: "checkbox", implemented: false },
      { name: "Radio", zh: "单选", path: "radio", implemented: false },
      { name: "Select", zh: "选择器", path: "select", implemented: false },
    ],
  },
  {
    label: "数据展示 Data Display",
    items: [
      { name: "Table", zh: "表格", path: "table", implemented: false },
      { name: "Empty", zh: "空状态", path: "empty", implemented: false },
    ],
  },
  {
    label: "反馈 Feedback",
    items: [
      { name: "Badge", zh: "徽标", path: "badge", implemented: false },
      { name: "Tooltip", zh: "文字提示", path: "tooltip", implemented: false },
      { name: "Popover", zh: "气泡", path: "popover", implemented: false },
      { name: "Alert", zh: "警告", path: "alert", implemented: false },
      { name: "Spin", zh: "加载", path: "spin", implemented: false },
      { name: "Skeleton", zh: "骨架屏", path: "skeleton", implemented: false },
      { name: "Progress", zh: "进度", path: "progress", implemented: false },
      { name: "Modal", zh: "模态框", path: "modal", implemented: false },
    ],
  },
  {
    label: "能力 Capability",
    items: [
      { name: "Auth", zh: "权限", path: "auth", implemented: false },
      { name: "Provide", zh: "注入", path: "provide", implemented: false },
      { name: "Lazy", zh: "懒渲染", path: "lazy", implemented: false },
      { name: "ConfigProvider", zh: "配置", path: "config-provider", implemented: false },
    ],
  },
  {
    label: "页面结构 Page Structure",
    items: [
      { name: "Page", zh: "页面容器", path: "page", implemented: false },
      { name: "Panel", zh: "面板", path: "panel", implemented: false },
      { name: "LayoutBasic", zh: "基础布局", path: "layout-basic", implemented: false },
      { name: "LayoutSider", zh: "侧边布局", path: "layout-sider", implemented: false },
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
