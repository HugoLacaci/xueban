import { expect, test, type Page } from "@playwright/test";

/** Salta el onboarding (primera visita) y entra en el chino. */
async function ready(page: Page) {
  await page.goto("/bienvenida");
  await page.waitForTimeout(1200);
  const skip = page.getByText("Saltar y usar valores por defecto");
  if (await skip.count()) {
    await skip.click();
    await page.waitForURL((u) => u.pathname === "/");
  }
  await page.goto("/zh");
  await expect(page.getByText("Tareas de hoy")).toBeVisible({ timeout: 20000 });
}

test.describe("Xuébàn · apuntes", () => {
  test("captura rápida con la tecla N → bandeja de entrada", async ({ page, isMobile }) => {
    test.skip(isMobile, "atajo de teclado: solo escritorio");
    await ready(page);
    // el atajo se registra al hidratar la página (en el servidor de desarrollo tarda un poco más)
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("n");
    const box = page.getByLabel("Texto de la captura");
    await expect(box).toBeVisible();
    await box.fill("在 va antes del verbo · 我在家吃饭");
    await page.getByRole("button", { name: "Guardar y abrir bandeja" }).click();
    await page.waitForURL(/\/zh\/apuntes\/bandeja/);
    await expect(page.getByText("在 va antes del verbo").first()).toBeVisible();
  });

  test("apuntes del profesor: se abre un compendio de gramática", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/apuntes/profesor");
    await expect(page.getByText(/Estructuras del HSK 1/).first()).toBeVisible({ timeout: 20000 });
  });

  test("cuaderno de ejercicios: importar frases, practicar y ver la corrección por capas", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/apuntes/cuaderno");
    await page.getByRole("button", { name: /Nuevo conjunto/ }).first().click();
    await page.getByPlaceholder("Clase 3 nov · deberes p. 23").fill("E2E · orden");
    await page.locator("#wb-text").fill("Yo como en casa. | 我在家吃饭。");
    await page.getByRole("button", { name: /Crear con 1 frases/ }).click();
    await page.getByRole("button", { name: "Practicar", exact: true }).click();
    const input = page.getByLabel("Respuesta en chino");
    await input.fill("我吃饭在家");
    await input.press("Enter");
    await expect(page.getByText("Frase correcta").first()).toBeVisible({ timeout: 15000 });
  });

  test("cuaderno: escribir la respuesta en la lista, añadir la corrección del profesor y corregir", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/apuntes/cuaderno");
    await page.getByRole("button", { name: /Nuevo conjunto/ }).first().click();
    await page.getByPlaceholder("Clase 3 nov · deberes p. 23").fill("E2E · lista");
    await page.locator("#wb-text").fill("Estoy en casa.\nYo como en casa.");
    await page.getByRole("button", { name: /Crear con 2 frases/ }).click();
    // primera frase: sin solución → solo reglas; luego se añade la del profesor y coincide
    const mine1 = page.getByLabel("Mi respuesta: Estoy en casa.");
    await mine1.fill("我在家");
    await page.getByLabel("Corrección del profesor: Estoy en casa.").fill("我在家。");
    // la corrección del profesor se acompaña de su pinyin
    await expect(page.locator('span[lang="zh-Latn"]').filter({ hasText: /Wǒ\s?zài\s?jiā/i }).first()).toBeVisible({ timeout: 15000 });
    await mine1.press("Enter");
    await expect(page.getByText("Coincide con la corrección del profesor.")).toBeVisible({ timeout: 15000 });
    // segunda frase: orden incorrecto → no coincide y se ve la frase del profesor
    await page.getByLabel("Mi respuesta: Yo como en casa.").fill("我吃饭在家");
    await page.getByLabel("Corrección del profesor: Yo como en casa.").fill("我在家吃饭。");
    await page.getByRole("button", { name: "Corregir" }).nth(1).click();
    await expect(page.getByText("No coincide con la corrección del profesor:")).toBeVisible({ timeout: 15000 });
    // la respuesta se guarda: al recargar sigue ahí
    await page.reload();
    await expect(page.getByLabel("Mi respuesta: Yo como en casa.")).toHaveValue("我吃饭在家");
  });

  test("apuntes vivos: la tabla de interrogativos se ve entera sin haber completado lecciones", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/apuntes/vivos?n=tabla-interrogativas");
    await expect(page.getByRole("heading", { name: "Palabras interrogativas" })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("cell", { name: "你为什么学中文？" })).toBeVisible();
    await expect(page.getByText(/se desbloquea en/)).toHaveCount(0);
  });

  test("tutor sin IA: los role-plays escritos a mano funcionan", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/tutor");
    await expect(page.getByText(/Role-plays/).first()).toBeVisible({ timeout: 20000 });
  });
});
