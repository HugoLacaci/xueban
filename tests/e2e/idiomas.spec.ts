import { expect, test, type Page } from "@playwright/test";

/** Onboarding con los tres idiomas elegidos y paso directo a la app. */
async function ready(page: Page) {
  await page.goto("/bienvenida");
  await page.waitForTimeout(1200);
  const skip = page.getByText("Saltar y usar valores por defecto");
  if (await skip.count()) {
    await skip.click();
    await page.waitForURL((u) => u.pathname === "/");
  }
}

const CASES = [
  { lang: "ja", seed: /710 en el mazo/, lesson: "ja-u01-l1", lessonHeading: /Buenos días, gracias, adiós/, query: "たべる", entry: "食べる", reading: "ふりがな" },
  { lang: "ko", seed: /861 en el mazo/, lesson: "ko-u01-l1", lessonHeading: /./, query: "먹다", entry: "먹다", reading: "로마자" },
] as const;

for (const c of CASES) {
  test.describe(`Paquete ${c.lang}`, () => {
    test("el panel Hoy carga la semilla y el plan del día", async ({ page }) => {
      await ready(page);
      await page.goto(`/${c.lang}`);
      await expect(page.getByText("Tareas de hoy")).toBeVisible();
      await expect(page.getByText(c.seed)).toBeVisible({ timeout: 20000 });
      await expect(page.locator("html")).toHaveAttribute("data-lang", c.lang);
      await expect(page.getByRole("button", { name: new RegExp(c.reading) })).toBeVisible();
    });

    test("abre una lección con vocabulario en la escritura del idioma", async ({ page }) => {
      await ready(page);
      await page.goto(`/${c.lang}/aprender/leccion/${c.lesson}`);
      await expect(page.getByRole("heading", { name: c.lessonHeading }).first()).toBeVisible({ timeout: 20000 });
      await expect(page.locator("main").locator(`[lang="${c.lang === "ja" ? "ja-JP" : "ko-KR"}"]`).first()).toBeVisible();
    });

    test("diccionario: busca y encuentra la palabra", async ({ page }) => {
      await ready(page);
      await page.goto(`/${c.lang}/diccionario?q=${encodeURIComponent(c.query)}`);
      await expect(page.getByText(c.entry).first()).toBeVisible({ timeout: 30000 });
    });
  });
}

test("cambiar de idioma desde la cabecera conserva la sección", async ({ page }) => {
  // onboarding eligiendo los tres idiomas (chino como principal)
  await page.goto("/bienvenida");
  await page.waitForTimeout(1200);
  for (const name of ["中文", "日本語", "한국어"]) await page.getByRole("button", { name: new RegExp(name) }).first().click();
  await page.getByText("Saltar y usar valores por defecto").click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto("/zh/diccionario");
  await page.getByTestId("lang-switcher").click();
  await page.getByRole("menuitem").filter({ hasText: "日本語" }).first().click();
  await page.waitForURL((u) => u.pathname.startsWith("/ja/diccionario"));
  await expect(page.locator("html")).toHaveAttribute("data-lang", "ja");
});

test("la página de práctica coreana carga", async ({ page }) => {
  await ready(page);
  await page.goto("/ko/practicar");
  await expect(page.getByRole("heading", { name: /Practicar/ }).first()).toBeVisible();
});
