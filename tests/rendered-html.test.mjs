import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders a translation-safe hydration shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Paris, Nouvelle Vie/);
  assert.match(html, /class="boot-screen"/);
  assert.match(html, /translate="no"/);
  assert.match(html, /name="google" content="notranslate"/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("keeps the requested gameplay systems in the product source", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("app/globals.css", projectRoot), "utf8"),
    readFile(new URL("package.json", projectRoot), "utf8"),
  ]);

  assert.match(page, /Бакалавриат/);
  assert.match(page, /СИМУЛЯТОР НОВОЙ ЖИЗНИ/);
  assert.match(page, /Паспорт талант/);
  assert.match(page, /Эйфелева башня/);
  assert.match(page, /Лувр/);
  assert.match(page, /testQuestions/);
  assert.match(page, /localStorage/);
  assert.match(page, /tutorialSteps/);
  assert.match(page, /storyChapters/);
  assert.match(page, /LocationBackdrop/);
  assert.match(page, /getTravelMinutes/);
  assert.match(page, /confirmTravel/);
  assert.match(page, /dailyTaskSets/);
  assert.match(page, /dialogues/);
  assert.match(page, /achievementDefs/);
  assert.match(page, /cityEvents/);
  assert.match(page, /activeDialogue/);
  assert.match(css, /pixel-portrait/);
  assert.match(css, /sky-sunset/);
  assert.match(css, /world-scene/);
  assert.match(css, /tutorial-modal/);
  assert.match(css, /travel-modal/);
  assert.match(css, /daily-plan-card/);
  assert.match(css, /dialogue-modal/);
  assert.match(css, /achievements-modal/);
  assert.match(css, /city-event-card/);
  assert.match(layout, /lang="ru"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
