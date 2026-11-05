import { expect, test, type Locator, type Page } from "@playwright/test";

/** Salta el onboarding (primera visita). */
async function ready(page: Page) {
  await page.goto("/bienvenida");
  await page.waitForTimeout(1200);
  const skip = page.getByText("Saltar y usar valores por defecto");
  if (await skip.count()) {
    await skip.click();
    await page.waitForURL((u) => u.pathname === "/");
  }
}

async function box(l: Locator) {
  const b = await l.boundingBox();
  expect(b, "el elemento debe estar visible").not.toBeNull();
  return b!;
}

function same(
  a: { x: number; y: number; width: number; height: number },
  b: typeof a,
  what: string,
) {
  for (const k of ["x", "y", "width", "height"] as const)
    expect(Math.abs(a[k] - b[k]), `${what}.${k}`).toBeLessThanOrEqual(1);
}

test.describe("Xuébàn · visor de origen y evolución", () => {
  for (const ch of ["马", "日", "人", "好"]) {
    test(`ficha de ${ch}: el visor, su pie y la tira no cambian de tamaño; sin temporizadores tras reproducir`, async ({
      page,
    }) => {
      await ready(page);
      await page.goto(`/zh/caracteres?q=${encodeURIComponent(ch)}`);
      const viewer = page.locator(`[data-origin-viewer="${ch}"]`);
      await expect(viewer).toBeVisible({ timeout: 30000 });
      await viewer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800); // carga del índice de glifos y pictogramas
      const parts = {
        viewer: viewer.locator('[data-part="viewer"]'),
        caption: viewer.locator('[data-part="caption"]'),
        strip: viewer.locator('[data-part="strip"]'),
      };
      const ref = {
        viewer: await box(parts.viewer),
        caption: await box(parts.caption),
        strip: await box(parts.strip),
      };
      // la tira siempre tiene 6 casillas
      await expect(parts.strip.getByRole("button")).toHaveCount(6);
      // recorrer todas las etapas a mano
      for (let i = 0; i < 6; i++) {
        await parts.strip.getByRole("button").nth(i).click();
        await page.waitForTimeout(350);
        same(await box(parts.viewer), ref.viewer, `visor (etapa ${i})`);
        same(await box(parts.caption), ref.caption, `pie (etapa ${i})`);
        same(await box(parts.strip), ref.strip, `tira (etapa ${i})`);
      }
      // nada cambia solo
      const stage = await viewer.getAttribute("data-stage");
      await page.waitForTimeout(2000);
      expect(await viewer.getAttribute("data-stage")).toBe(stage);
      // reproducción única: termina en el carácter actual y sin temporizadores pendientes
      await viewer.getByRole("button", { name: "Ver evolución" }).click();
      await expect(viewer).toHaveAttribute("data-playing", "true");
      await expect(viewer).toHaveAttribute("data-playing", "false", { timeout: 8000 });
      await expect(viewer).toHaveAttribute("data-stage", "regular");
      await expect(viewer).toHaveAttribute("data-timers", "0");
      same(await box(parts.viewer), ref.viewer, "visor tras reproducir");
      same(await box(parts.caption), ref.caption, "pie tras reproducir");
      same(await box(parts.strip), ref.strip, "tira tras reproducir");
      await page.waitForTimeout(1500);
      await expect(viewer).toHaveAttribute("data-stage", "regular");
    });
  }

  test("pestaña Origen: las miniaturas de la galería están quietas sin hover", async ({ page }) => {
    await ready(page);
    await page.goto("/zh/caracteres");
    await page.getByRole("tab", { name: /Origen/ }).click();
    const thumbs = page.locator("[data-origin-thumb]");
    await expect(thumbs.first()).toBeVisible({ timeout: 20000 });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1500);
    const n = Math.min(await thumbs.count(), 12);
    for (let i = 0; i < n; i++) await expect(thumbs.nth(i)).toHaveAttribute("data-timers", "0");
  });
});
