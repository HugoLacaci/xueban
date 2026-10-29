import { expect, test, type Page } from "@playwright/test";

/** Salta el onboarding (primera visita) y espera a que la app esté lista. */
async function ready(page: Page) {
  await page.goto("/bienvenida");
  await page.waitForTimeout(1200);
  const skip = page.getByText("Saltar y usar valores por defecto");
  if (await skip.count()) {
    await skip.click();
    await page.waitForURL((u) => /^\/zh\/?$/.test(u.pathname));
  }
}

test.describe("Xuébàn · flujos principales", () => {
  test("el panel Hoy carga la semilla HSK 1 y el plan del día", async ({ page }) => {
    await ready(page);
    await expect(page.getByText("Tareas de hoy")).toBeVisible();
    await expect(page.getByText(/302 en el mazo/)).toBeVisible();
  });

  test("completar una lección: vocabulario → diálogo → gramática → ejercicios → repaso", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/aprender/leccion/u01-l1");
    await expect(page.getByRole("heading", { name: /Hola, gracias, adiós/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Las 7 expresiones que usarás cada día" })).toBeVisible();
    await page.getByRole("button", { name: "En la puerta de la escuela" }).click();
    await expect(page.getByRole("heading", { name: "En la puerta de la escuela" })).toBeVisible();
    await page.getByRole("button", { name: /Preguntas con 吗/ }).click();
    await expect(page.getByRole("heading", { name: /Preguntas con 吗/ })).toBeVisible();
    await page.getByRole("button", { name: "Ejercicios", exact: true }).click();
    // ejercicios: responder o saltar hasta terminar
    await expect(page.locator("text=/\\d+ \\/ \\d+/").first()).toBeVisible({ timeout: 20000 });
    for (let i = 0; i < 40; i++) {
      const done = page.getByText("Ejercicios terminados");
      if (await done.count()) break;
      const opt = page.locator("button:has(kbd:text-is('1'))").first();
      if ((await opt.count()) && (await opt.isEnabled())) await opt.click();
      else {
        const skip = page.getByRole("button", { name: /Saltar/ });
        if (await skip.count()) await skip.click();
      }
      if (await page.getByText("Ejercicios terminados").count()) break;
      const cont = page.getByRole("button", { name: /Continuar|Terminar/ });
      if (await cont.count()) await cont.first().click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText("Ejercicios terminados")).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Repaso de la lección")).toBeVisible();
    await page.getByRole("button", { name: /Terminar lección/ }).click({ force: true });
    // guardar progreso + pantalla final con animación: en el servidor de desarrollo puede tardar más de 5 s
    await expect(page.getByText("¡Lección completada!")).toBeVisible({ timeout: 20000 });
    await page.goto("/zh/aprender");
    await expect(page.getByText(/1 de \d+ lecciones completadas/)).toBeVisible();
  });

  test("añadir una palabra y verla en flashcards", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/flashcards");
    await page.getByRole("button", { name: /Añadir palabra/ }).click();
    await page.getByLabel("汉字", { exact: true }).fill("啤酒");
    await page.getByLabel("Significado (español)").fill("cerveza");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/啤酒 añadida a flashcards/)).toBeVisible();
    await page.getByPlaceholder("Buscar en el mazo…").fill("啤酒");
    await expect(page.locator("a", { hasText: "啤酒" }).first()).toBeVisible();
    await page.locator("a", { hasText: "啤酒" }).first().click();
    await expect(page.getByText("Tarjetas y estado")).toBeVisible();
    await expect(page.getByText("cerveza").first()).toBeVisible();
  });

  test("repasar flashcards con atajos de teclado", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/flashcards/repasar");
    await expect(page.getByText(/1 \/ \d+/)).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Enter");
    await expect(page.getByText("Otra vez")).toBeVisible();
    await page.keyboard.press("3");
    await expect(page.getByText(/2 \/ \d+/)).toBeVisible();
  });

  test("ver un vídeo curado con subtítulos interactivos", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/videos");
    await expect(page.getByText("Vídeos curados para principiantes")).toBeVisible();
    await page.locator("a[href*='/zh/videos/']").first().click();
    await expect(page.getByRole("tab", { name: /Transcripción/ })).toBeVisible();
    await expect(page.locator(".zh-word").first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("tab", { name: /Vocabulario nuevo/ }).click();
    await expect(page.getByText(/añadir|Conoces todas/).first()).toBeVisible({ timeout: 15000 });
  });

  test("diccionario: buscar por pinyin y abrir la ficha", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/diccionario?q=xuesheng");
    await expect(page.locator("li", { hasText: "学生" }).first()).toBeVisible({ timeout: 20000 });
    await page.locator("li", { hasText: "学生" }).first().getByRole("button").click();
    await expect(page.getByText("estudiante").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Caracteres" })).toBeVisible();
  });

  test("popup de diccionario al pulsar una palabra y atajo P de pinyin", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/lectura/r01");
    await page.locator(".zh-word").first().click();
    await expect(page.getByRole("dialog", { name: /Diccionario/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("p");
    await expect(page.locator(".pinyin-unknown, .pinyin-hidden").first()).toBeVisible();
  });
});
