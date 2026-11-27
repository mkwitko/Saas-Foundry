import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_CONFIG = {
  schema_version: "0.1",
  baseURL: "http://127.0.0.1:3000",
  allowRemote: false,
  routes: [{ name: "home", path: "/" }],
  viewports: [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 }
  ],
  checks: { horizontalOverflow: true, brokenImages: true, consoleErrors: true, accessibility: true },
  notes: "Edit routes and baseURL for this project. Start the app yourself before running the audit."
};

const SPEC = String.raw`const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const configPath = path.join(process.cwd(), ".foundry", "visual-audit", "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

for (const route of config.routes) {
  for (const viewport of config.viewports) {
    test(route.name + " responsive: " + viewport.name, async ({ page }, testInfo) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(new URL(route.path, config.baseURL).toString(), { waitUntil: "domcontentloaded" });
      expect(response, "Navigation should return a response").not.toBeNull();
      expect(response.status(), "Route should return a successful HTTP status").toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
      if (route.readySelector) await expect(page.locator(route.readySelector)).toBeVisible({ timeout: 10000 });

      if (config.checks.horizontalOverflow) {
        const overflow = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth
        }));
        expect(overflow.document, "Document has horizontal overflow").toBeLessThanOrEqual(overflow.viewport + 1);
        expect(overflow.body, "Body has horizontal overflow").toBeLessThanOrEqual(overflow.viewport + 1);
      }
      if (config.checks.brokenImages) {
        const broken = await page.locator("img").evaluateAll(images =>
          images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.currentSrc || image.src)
        );
        expect(broken, "Page contains broken images").toEqual([]);
      }
      if (config.checks.consoleErrors) {
        expect([...consoleErrors, ...pageErrors], "Browser console or uncaught page errors").toEqual([]);
      }

      await fs.promises.mkdir(testInfo.outputDir, { recursive: true });
      await page.screenshot({ path: testInfo.outputPath(route.name + "-" + viewport.name + ".png"), fullPage: true });
      await testInfo.attach("viewport", { body: JSON.stringify({ route: route.path, ...viewport }, null, 2), contentType: "application/json" });
    });
  }
}

let AxeBuilder;
try { AxeBuilder = require("@axe-core/playwright"); } catch {}
for (const route of config.routes) {
  test(route.name + " accessibility: WCAG 2.1 AA", async ({ page }, testInfo) => {
    test.skip(!config.checks.accessibility, "Accessibility check disabled in project config");
    test.skip(!AxeBuilder, "Install @axe-core/playwright to enable automated WCAG checks");
    await page.goto(new URL(route.path, config.baseURL).toString(), { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    await testInfo.attach("axe-results", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
    expect(results.violations.map(item => ({ id: item.id, impact: item.impact, description: item.description })), "WCAG violations").toEqual([]);
  });
}
`;
const PLAYWRIGHT_CONFIG = `const path = require("node:path");
module.exports = {
  testDir: path.join(__dirname),
  testMatch: "**/*.spec.cjs",
  outputDir: path.resolve(__dirname, "../../artifacts/visual-audit"),
  reporter: [["list"], ["json", { outputFile: path.resolve(__dirname, "../../reports/visual-audit.playwright.json") }]],
  use: { headless: true, screenshot: "only-on-failure", trace: "retain-on-failure" },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined
};
`;

export function initializeVisualAudit(projectRoot, { baseURL } = {}) {
  const root = path.resolve(projectRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error("Visual audit target must be an existing project directory.");
  const directory = path.join(root, ".foundry", "visual-audit");
  const files = [
    { path: path.join(directory, "config.json"), content: JSON.stringify({ ...DEFAULT_CONFIG, ...(baseURL ? { baseURL } : {}) }, null, 2) + "\n" },
    { path: path.join(directory, "visual-audit.spec.cjs"), content: SPEC },
    { path: path.join(directory, "playwright.config.cjs"), content: PLAYWRIGHT_CONFIG }
  ];
  const results = files.map(file => {
    if (fs.existsSync(file.path)) return { path: path.relative(root, file.path), status: "preserved" };
    fs.mkdirSync(path.dirname(file.path), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file.path, file.content, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return { path: path.relative(root, file.path), status: "created" };
  });
  return { project_root: root, config: ".foundry/visual-audit/config.json", results, next_step: "Edit routes and baseURL, install Playwright explicitly, start the app, then run foundry visual-audit run ." };
}

function playwrightCli(projectRoot) {
  const candidates = [
    path.join(projectRoot, "node_modules", "playwright", "cli.js"),
    path.join(projectRoot, "node_modules", "@playwright", "test", "cli.js")
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

export function readVisualAuditConfig(projectRoot) {
  const file = path.join(path.resolve(projectRoot), ".foundry", "visual-audit", "config.json");
  if (!fs.existsSync(file)) throw new Error("Visual audit config is missing. Run foundry visual-audit init <project> first.");
  let config;
  try { config = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error("Could not parse visual audit config; original file preserved: " + error.message); }
  if (!config || config.schema_version !== "0.1" || typeof config.baseURL !== "string" || !Array.isArray(config.routes) || config.routes.length === 0 || !Array.isArray(config.viewports) || config.viewports.length === 0 || typeof config.checks !== "object") {
    throw new Error("Visual audit config must define schema_version 0.1, baseURL, non-empty routes/viewports and checks.");
  }
  let base;
  try { base = new URL(config.baseURL); } catch { throw new Error("Visual audit baseURL must be a valid absolute URL."); }
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Visual audit baseURL must use HTTP(S) and must not contain credentials.");
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(base.hostname) && config.allowRemote !== true) throw new Error("Remote visual audits are disabled by default. Set allowRemote: true only for an explicitly approved non-production staging environment.");
  if (config.routes.length > 100 || config.viewports.length > 10) throw new Error("Visual audit supports at most 100 routes and 10 viewports.");
  for (const route of config.routes) {
    if (!route || typeof route.name !== "string" || !/^[a-zA-Z0-9_-]{1,60}$/.test(route.name) || typeof route.path !== "string" || !route.path.startsWith("/") || route.path.startsWith("//")) {
      throw new Error("Each visual audit route needs a safe name and a path beginning with a single '/'.");
    }
    if (route.readySelector != null && typeof route.readySelector !== "string") throw new Error("route.readySelector must be a string when provided.");
  }
  for (const viewport of config.viewports) {
    if (!viewport || typeof viewport.name !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(viewport.name) ||
        !Number.isInteger(viewport.width) || viewport.width < 240 || viewport.width > 3840 ||
        !Number.isInteger(viewport.height) || viewport.height < 320 || viewport.height > 2160) {
      throw new Error("Each viewport needs a safe name, width 240–3840 and height 320–2160.");
    }
  }
  return config;
}

export function runVisualAudit(projectRoot) {
  const root = path.resolve(projectRoot);
  readVisualAuditConfig(root);
  const configFile = path.join(root, ".foundry", "visual-audit", "playwright.config.cjs");
  if (!fs.existsSync(configFile)) throw new Error("Visual audit Playwright config is missing. Re-run foundry visual-audit init <project> or restore the file.");
  const cli = playwrightCli(root);
  if (!cli) throw new Error("Playwright is not installed in this project. Install it explicitly with npm install -D @playwright/test, then install the required browser with npx playwright install chromium.");
  const result = spawnSync(process.execPath, [cli, "test", "--config", configFile], { cwd: root, stdio: "inherit", env: process.env });
  if (result.error) throw new Error("Could not start Playwright: " + result.error.message);
  const report = readVisualAuditReport(root);
  return { exit_code: result.status ?? 1, signal: result.signal ?? null, report };
}

function collectTests(suites, output = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const results = test.results ?? [];
        const latest = results.at(-1);
        const flaky = results.length > 1 && latest?.status === "passed" && results.slice(0, -1).some(result => result.status !== "passed" && result.status !== "skipped");
        output.push({ title: spec.title, project: test.projectName ?? null, status: latest?.status ?? "unknown", flaky, duration_ms: latest?.duration ?? null, errors: (latest?.errors ?? []).map(error => error.message ?? error.value ?? "Unknown error") });
      }
    }
    collectTests(suite.suites, output);
  }
  return output;
}

export function readVisualAuditReport(projectRoot) {
  const file = path.join(path.resolve(projectRoot), ".foundry", "reports", "visual-audit.playwright.json");
  if (!fs.existsSync(file)) return { available: false, reason: "No Playwright JSON report found. Run the visual audit first.", tests: [], summary: { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 } };
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error("Could not parse the visual audit report: " + error.message); }
  const tests = collectTests(raw.suites);
  const summary = {
    total: tests.length,
    passed: tests.filter(item => item.status === "passed").length,
    failed: tests.filter(item => ["failed", "timedOut", "interrupted"].includes(item.status)).length,
    skipped: tests.filter(item => item.status === "skipped").length,
    flaky: tests.filter(item => item.flaky).length
  };
  return { available: true, generated_at: raw.stats?.startTime ?? null, summary, tests, report: ".foundry/reports/visual-audit.playwright.json", artifacts: ".foundry/artifacts/visual-audit" };
}
