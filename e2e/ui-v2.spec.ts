import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  // Controlled AxeBuilder scans own this page; normal Storybook scans stay on.
  await page.goto("/iframe.html?id=ui-v2--workspace&viewMode=story&globals=a11y.manual:!true");
  await expect(page.getByRole("heading", { name: "공통 UI v2" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

test("Select keyboard, Escape and focus restoration", async ({ page }) => {
  const select = page.getByRole("combobox", { name: "언어" });
  await select.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("option", { name: "English", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "한국어", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "日本語", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(
    page.getByRole("option", { name: "English", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(select).toHaveText(/English/);
  await expect(select).toBeFocused();
  await select.press("Enter");
  await page.keyboard.press("Escape");
  await expect(select).toBeFocused();
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("form controls submit real values and preserve invalid input", async ({
  page,
}) => {
  await page.getByRole("switch", { name: "주간 요약" }).click();
  await page.getByRole("checkbox", { name: "이메일 알림" }).check();
  await page.getByRole("combobox", { name: "언어" }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await page.getByLabel("알림 이메일", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "변경사항 저장" }).click();
  await expect(
    page.getByText("올바른 이메일 주소를 입력해 주세요."),
  ).toBeVisible();
  await expect(page.getByLabel("알림 이메일", { exact: true })).toHaveValue(
    "invalid",
  );
  await page
    .getByLabel("알림 이메일", { exact: true })
    .fill("test@example.com");
  await page.getByRole("button", { name: "변경사항 저장" }).click();
  await expect(page.getByTestId("save-status")).toHaveText(/저장했습니다/);
  await expect(page.getByTestId("submitted")).toHaveText(/"language":"en"/);
  await expect(page.getByTestId("submitted")).toHaveText(
    /"emailNotifications":"on"/,
  );
  await expect(page.getByTestId("submitted")).not.toHaveText(/"weekly"/);
  await expect(
    page.getByRole("checkbox", { name: "일부 선택 예시" }),
  ).toHaveAttribute("aria-checked", "mixed");
  await expect(
    page.getByRole("switch", { name: "비활성 예시" }),
  ).toBeDisabled();
});

test("computed sizes, theme override and portaled density", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("button", { name: "라이트", exact: true }).click();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(247, 248, 250)",
  );
  const input = page.getByLabel("워크스페이스 이름");
  await expect(input).toHaveCSS("font-size", "16px");
  await expect(input).toHaveCSS("height", "40px");
  await page.getByRole("button", { name: "촘촘하게", exact: true }).click();
  await expect(input).toHaveCSS("height", "36px");
  await page.getByRole("combobox", { name: "언어" }).click();
  await expect(page.getByRole("listbox")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  const triggerWidth = await page
    .locator("#language")
    .evaluate((e) => e.getBoundingClientRect().width);
  const menuWidth = await page
    .getByRole("listbox")
    .evaluate((e) => e.getBoundingClientRect().width);
  expect(Math.abs(menuWidth - triggerWidth)).toBeLessThan(3);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-ui-layout=settings]")).toHaveCSS(
    "max-width",
    "640px",
  );
  await expect(page.locator("[data-ui-layout=list]")).toHaveCSS(
    "max-width",
    "1200px",
  );
});

test("dialog, menu and list state recovery", async ({ page }) => {
  await page.getByRole("button", { name: "새 작업", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "새 작업", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "작업 메뉴" }).click();
  await expect(
    page.getByRole("menuitem", { name: "작업 번호 복사" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "오류 상태" }).click();
  await expect(page.getByText("작업을 불러오지 못했습니다.")).toBeVisible();
  await page.getByRole("button", { name: "다시 불러오기" }).click();
  await expect(
    page.getByRole("button", { name: /팀 워크스페이스 설정/ }),
  ).toBeVisible();
});

test("mobile layout and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByLabel("워크스페이스 이름")).toHaveCSS(
    "height",
    "44px",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "새 작업", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("dialog")).toHaveCSS("transition-duration", "0s");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((e) => e.getBoundingClientRect().right <= innerWidth),
  ).toBe(true);
});

for (const theme of ["라이트", "다크"])
  test(`accessibility: ${theme}`, async ({ page }) => {
    await page.getByRole("button", { name: theme, exact: true }).click();
    await page.waitForTimeout(200);
    const result = await new AxeBuilder({ page })
      .include("#ui-v2-demo")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });

test("compact panels and consumer height overrides", async ({ page }) => {
  const card = page.locator('[data-slot="card"]').first();
  await expect(card).toHaveCSS("padding-top", "24px");
  await page.getByRole("button", { name: "촘촘하게", exact: true }).click();
  await expect(card).toHaveCSS("padding-top", "20px");
  await expect(card).toHaveCSS("row-gap", "16px");
  await expect(card.locator('[data-slot="card-content"]').first()).toHaveCSS(
    "padding-left",
    "20px",
  );
  const input = page.getByLabel("워크스페이스 이름");
  await input.evaluate((e) => e.classList.add("h-8"));
  await expect(input).toHaveCSS("height", "32px");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(input).toHaveCSS("height", "44px");
});
