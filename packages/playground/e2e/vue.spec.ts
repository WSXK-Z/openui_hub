import { test, expect } from "@playwright/test";

// 覆盖 page → panel → component 组织范式下的真实渲染链路
test("renders @dp_ui/core playground home (full install)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("全量加载演示")).toBeVisible();
  await expect(page.locator(".dp-button--primary")).toBeVisible();
  await expect(page.locator(".dp-panel")).toHaveCount(4);
});

test("renders on-demand page (named imports)", async ({ page }) => {
  await page.goto("/on-demand");
  await expect(page.getByText("按需加载演示")).toBeVisible();
  await expect(page.locator(".dp-layout--sider")).toBeVisible();
});
