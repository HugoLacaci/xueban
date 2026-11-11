import { expect, test, type Page } from "@playwright/test";

/** Salta el onboarding (primera visita) y espera a que la app esté lista. */
async function ready(page: Page) {
  await page.goto("/bienvenida");
  await page.waitForTimeout(1200);
  const skip = page.getByText("Saltar y usar valores por defecto");
  if (await skip.count()) {
    await skip.click();
    // el onboarding vuelve a la portada; desde ahí se entra en el chino
    await page.waitForURL((u) => u.pathname === "/");
  }
  await page.goto("/zh");
}

test.describe("Xuébàn · flujos principales", () => {
  test("el panel Hoy carga la semilla HSK 1 y el plan del día", async ({ page }) => {
    await ready(page);
    await expect(page.getByText("Tareas de hoy")).toBeVisible();
    await expect(page.getByText(/302 en el mazo/)).toBeVisible();
  });

  test("completar una lección del temario v2 (el enlace antiguo redirige): objetivo → … → ejercicios → apuntes", async ({ page }) => {
    await ready(page);
    // enlace del temario antiguo → lección equivalente del nuevo
    await page.goto("/zh/aprender/leccion/u01-l1");
    await page.waitForURL(/\/aprender\/leccion\/a1-u01-l1/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: /Yo soy, tú eres/ })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Objetivo de hoy" })).toBeVisible();
    await page.getByRole("button", { name: /Sujeto \+ 是/ }).first().click();
    await expect(page.locator("[data-skeleton]").first()).toBeVisible();
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
    // último paso: «Tus apuntes han crecido»
    await page.getByRole("button", { name: "Tus apuntes" }).click();
    await expect(page.getByRole("heading", { name: "Tus apuntes han crecido" })).toBeVisible();
    await page.getByRole("button", { name: /Terminar lección/ }).click({ force: true });
    await expect(page.getByText("¡Lección completada!")).toBeVisible({ timeout: 20000 });
    await page.goto("/zh/aprender");
    await expect(page.getByText(/1 de \d+ lecciones completadas/)).toBeVisible();
  });

  test("una palabra en dos categorías: 几 también en «Números y cantidades»", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/flashcards");
    const chip = page.getByRole("button", { name: /^Números y cantidades/ });
    const before = Number((await chip.first().innerText()).match(/\/(\d+)/)?.[1]);
    await page.goto(`/zh/flashcards/${encodeURIComponent("hsk1-几")}`);
    await expect(page.getByText("Tarjetas y estado")).toBeVisible({ timeout: 20000 });
    await page.getByRole("group", { name: "También en…" }).getByRole("button", { name: "Números y cantidades" }).click();
    await page.getByRole("button", { name: /Guardar cambios/ }).click();
    await expect(page.getByText("Guardado")).toBeVisible();
    await page.goto("/zh/flashcards");
    await expect(chip.first()).toContainText(`/${before + 1}`);
    await chip.first().click();
    await page.getByPlaceholder("Buscar en el mazo…").fill("几");
    await expect(page.locator("a", { hasText: "几" }).first()).toBeVisible();
    // sigue estando en su categoría principal
    await chip.first().click();
    await page.getByRole("button", { name: /^Preguntas/ }).first().click();
    await expect(page.locator("a", { hasText: "几" }).first()).toBeVisible();
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
