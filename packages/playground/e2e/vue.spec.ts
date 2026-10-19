import { test, expect } from "@playwright/test";

// 覆盖 page → panel → component 组织范式下的真实渲染链路
test("renders @dp_ui/core playground home (full install)", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByText("全量加载演示")).toBeVisible();
    await expect(page.locator(".dp-button--primary")).toBeVisible();
    await expect(page.locator(".dp-panel")).toHaveCount(3);
});

test("renders on-demand page (named imports)", async ({ page }) => {
    await page.goto("/on-demand");
    await expect(
        page.getByText("按需加载（具名导入 + tree-shaking）"),
    ).toBeVisible();
    await expect(page.locator(".dp-layout--sider")).toBeVisible();
});

// 组件文档站：侧边目录 + 演示卡片 + 代码展开
test("renders component documentation with demo cards", async ({ page }) => {
    await page.goto("/docs/button");
    await expect(
        page.getByRole("heading", { name: "Button 按钮" }),
    ).toBeVisible();
    await expect(page.locator(".pg-demo-card")).toHaveCount(9);
    await expect(page.locator(".pg-demo-card__code")).toHaveCount(0);

    await page.getByRole("button", { name: "显示代码" }).first().click();
    await expect(page.locator(".pg-demo-card__code").first()).toBeVisible();
});
