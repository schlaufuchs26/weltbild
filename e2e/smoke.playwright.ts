import { expect, test } from "@playwright/test";

/**
 * Browser smoke test for Weltbild.
 *
 * happy-dom covers the game logic; these checks cover the browser only:
 * the bundle boots, the panels render, a guess goes through, and the layout
 * holds on a laptop viewport (1366x768 minus browser chrome).
 */

const LAPTOP = { width: 1280, height: 757 };

test("the game boots with three panels", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("heading", { name: /Weltbild/ })).toBeVisible();
  await expect(page).toHaveTitle(/Weltbild/);
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Guess" })).toBeVisible();
  await expect(page.getByText("Round 1 / 6")).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test("a guess is answered", async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  await page.locator("input.num").fill("1980");
  await page.getByRole("button", { name: "Guess" }).click();

  // Either the year was right (reveal) or the game says early/late.
  await expect(
    page.getByText(/Earlier, and|Later, and|the year was/),
  ).toBeVisible();
});

test("asking for an extra panel adds a card", async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  await page.getByRole("button", { name: "people" }).click();
  await expect(page.getByRole("article")).toHaveCount(4);
});

test("nothing overflows the laptop viewport", async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  const doc = await page.evaluate(() => {
    const el = document.scrollingElement;
    return {
      scrollWidth: el?.scrollWidth ?? 0,
      innerWidth: window.innerWidth,
    };
  });
  expect(doc.scrollWidth).toBeLessThanOrEqual(doc.innerWidth);
});
