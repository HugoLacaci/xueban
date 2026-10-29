import { expect, test } from "@playwright/test";

/** Portada «Tres puertas» (/?elegir=1): entrar en un idioma activo y dar de alta uno nuevo. */
test("portada: abrir una puerta activa y dar de alta un idioma nuevo", async ({ page }) => {
  await page.goto("/bienvenida");
  await page.waitForTimeout(1200);
  for (const n of ["中文", "日本語"]) await page.getByRole("button", { name: new RegExp(n) }).first().click();
  await page.getByText("Saltar y usar valores por defecto").click();
  await page.waitForURL((u) => /^\/zh\/?$/.test(u.pathname));

  await page.goto("/?elegir=1");
  await expect(page.getByRole("heading", { name: "¿Qué quieres estudiar hoy?" })).toBeVisible();
  await expect(page.locator(".portal")).toHaveCount(3);
  await expect(page.locator(".portal[data-skin='ko']")).toHaveAttribute("data-state", "inactive");

  // puerta activa → panel del idioma
  await page.locator(".portal[data-skin='ja']").click();
  await page.waitForURL((u) => u.pathname.startsWith("/ja"));

  // puerta entornada → mini-onboarding → entra en coreano
  await page.goto("/?elegir=1");
  await page.locator(".portal[data-skin='ko']").click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  await dlg.getByRole("button", { name: /Empiezo de cero/ }).click();
  await dlg.getByRole("button", { name: /^Empezar/ }).last().click();
  await page.waitForURL((u) => u.pathname.startsWith("/ko"));
});
