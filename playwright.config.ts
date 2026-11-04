import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  // PW_BASE=http://localhost:3100 usa un servidor ya arrancado (p. ej. next start) en lugar de next dev
  use: { baseURL: process.env.PW_BASE ?? "http://localhost:3000", locale: "es-ES", trace: "retain-on-failure" },
  webServer: process.env.PW_BASE ? undefined : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
