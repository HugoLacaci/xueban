import { expect, test } from "@playwright/test";

/** Portada «Tres puertas» (raíz «/»): es la primera pantalla de la web y la entrada a cada idioma. */
test("primera visita: la raíz muestra la elección de idioma y dar de alta uno entra en él", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "¿Qué quieres aprender?" })).toBeVisible();
  await expect(page).toHaveURL((u) => u.pathname === "/");
  await expect(page.locator(".portal")).toHaveCount(3);
  for (const l of ["zh", "ja", "ko"]) await expect(page.locator(`.portal[data-skin='${l}']`)).toHaveAttribute("data-state", "inactive");

  // abrir la puerta japonesa → mini-onboarding → entra en japonés
  await page.locator(".portal[data-skin='ja']").click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  await dlg.getByRole("button", { name: /Empiezo de cero/ }).click();
  await dlg.getByRole("button", { name: /^Empezar/ }).last().click();
  await page.waitForURL((u) => u.pathname.startsWith("/ja"));

  // de vuelta en la raíz: japonés activo, chino y coreano siguen entornados
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "¿Qué quieres estudiar hoy?" })).toBeVisible();
  await expect(page.locator(".portal[data-skin='ja']")).not.toHaveAttribute("data-state", "inactive");
  await expect(page.locator(".portal[data-skin='zh']")).toHaveAttribute("data-state", "inactive");
});

test("con idiomas activos: abrir una puerta lleva a su panel y el enlace antiguo ?elegir=1 sigue funcionando", async ({ page }) => {
  await page.goto("/bienvenida");
  await page.waitForTimeout(1200);
  for (const n of ["中文", "日本語"]) await page.getByRole("button", { name: new RegExp(n) }).first().click();
  await page.getByText("Saltar y usar valores por defecto").click();
  // al terminar el onboarding se vuelve a la portada
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.getByRole("heading", { name: "¿Qué quieres estudiar hoy?" })).toBeVisible();

  await page.locator(".portal[data-skin='ja']").click();
  await page.waitForURL((u) => u.pathname.startsWith("/ja"));

  await page.goto("/?elegir=1");
  await expect(page.locator(".portal")).toHaveCount(3);
});
