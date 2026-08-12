import { expect, test } from "@playwright/test";

/** P1-31: lightweight UI smoke (no Meteor required for page shells). */
test.describe("web smoke", () => {
  test("marketing home loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });
    console.log(JSON.stringify({ level: "info", event: "e2e.home.ok" }));
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
    console.log(JSON.stringify({ level: "info", event: "e2e.login.ok" }));
  });

  test("web health endpoint", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("dink-web");
    console.log(JSON.stringify({ level: "info", event: "e2e.health.ok", apiOk: body.api?.ok }));
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
  });

  test("compete hub loads", async ({ page }) => {
    await page.goto("/compete");
    await expect(page.getByRole("heading", { name: /compete/i }).first()).toBeVisible({ timeout: 20_000 });
    console.log(JSON.stringify({ level: "info", event: "e2e.compete.ok" }));
  });
});
