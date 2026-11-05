import { expect, test, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/bienvenida");
  await page.waitForTimeout(1200);
  const skip = page.getByText("Saltar y usar valores por defecto");
  if (await skip.count()) {
    await skip.click();
    await page.waitForURL((u) => u.pathname === "/");
  }
}

async function noHorizontalOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, "la página no debe desplazarse en horizontal").toBeLessThanOrEqual(iw + 1);
}

test.describe("Xuébàn · temario v2", () => {
  test("lección modelo: el esqueleto muestra el hueco nuevo y no desborda", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/aprender/leccion/a1-u01-l1");
    await page.getByRole("button", { name: /Sujeto \+ 是/ }).first().click();
    const sk = page.locator("[data-skeleton]").first();
    await expect(sk).toBeVisible({ timeout: 20000 });
    await expect(sk.getByText("nuevo").first()).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("«Construye la frase»: ordenar los trozos y comprobar", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/aprender/leccion/a1-u01-l1");
    await page.getByRole("button", { name: /Construye la frase/ }).first().click();
    for (const t of ["我", "是", "学生"]) await page.getByRole("button", { name: t, exact: true }).last().click();
    await page.getByRole("button", { name: "Comprobar" }).click();
    await expect(page.getByText(/¡Correcto!/)).toBeVisible();
  });

  test("Etapa 0: tabla de pinyin, esquema de Chao y reglas del pinyin", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/aprender/leccion/e0-09");
    await page.getByRole("button", { name: /Tabla de pinyin/ }).first().click();
    const grid = page.locator("[data-pinyin-grid]");
    await expect(grid).toBeVisible({ timeout: 20000 });
    await grid.getByRole("button", { name: "ji", exact: true }).click();
    await expect(grid.getByRole("button", { name: "jì" })).toBeVisible();
    await noHorizontalOverflow(page);
    await page.goto("/zh/aprender/leccion/e0-10");
    await page.getByRole("button", { name: /Esquema de los tonos/ }).first().click();
    await expect(page.locator("[data-chao]")).toBeVisible({ timeout: 20000 });
    await page.goto("/zh/aprender/leccion/e0-07");
    await page.getByRole("button", { name: /Reglas del pinyin/ }).first().click();
    await expect(page.locator("[data-pinyin-rules]")).toBeVisible({ timeout: 20000 });
  });

  test("apuntes vivos: índice y frases modelo", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/apuntes/vivos");
    await expect(page.getByRole("heading", { name: "Apuntes vivos" })).toBeVisible({ timeout: 20000 });
    await page.getByText("Mis frases modelo").click();
    await expect(page.getByRole("heading", { name: "Mis frases modelo" })).toBeVisible();
  });
});
