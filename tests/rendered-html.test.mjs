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
  const [page, layout, css, packageJson, metroMap] = await Promise.all([
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("app/globals.css", projectRoot), "utf8"),
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("app/game/paris-metro-schematic.json", projectRoot), "utf8"),
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
  assert.match(page, /metroLines/);
  assert.match(page, /buildMetroRoute/);
  assert.match(page, /chooseMetroDirection/);
  assert.match(page, /activeTravel/);
  assert.match(page, /completedDailyTaskIds/);
  assert.match(page, /showEventReveal/);
  assert.match(page, /actionProgress/);
  assert.match(page, /moreDialogues/);
  assert.match(page, /npcDialogueProgress/);
  assert.match(page, /PixelMetroMap/);
  assert.match(page, /dayTransitionPhase/);
  assert.match(page, /getActivityKind/);
  assert.match(page, /dialogueMissions/);
  assert.match(page, /dialogueFollowUps/);
  assert.match(page, /dialogueTangents/);
  assert.match(page, /getDialogueClosingRound/);
  assert.match(page, /relationships/);
  assert.match(page, /npcAssignments/);
  assert.match(page, /cafeOrderPool/);
  assert.match(page, /activeCafeShift/);
  assert.match(page, /EventArtwork/);
  assert.match(page, /remainingDayHours/);
  assert.match(page, /completedActionIds/);
  assert.match(page, /dialoguePendingRelationship/);
  assert.doesNotMatch(page, /Продолжить разговор/);
  assert.doesNotMatch(page, /dialogue-auto-next/);
  assert.match(page, /metroSchematic/);
  assert.doesNotMatch(page, /РАЗГОВОР \{activeDialogueIndex \+ 1\} ИЗ/);
  assert.doesNotMatch(page, /type="range"/);
  assert.doesNotMatch(page, /Разобрать письма|Приготовить ужин/);
  assert.match(css, /pixel-portrait/);
  assert.match(css, /sky-sunset/);
  assert.match(css, /world-scene/);
  assert.match(css, /tutorial-modal/);
  assert.match(css, /travel-modal/);
  assert.match(css, /daily-plan-card/);
  assert.match(css, /dialogue-modal/);
  assert.match(css, /achievements-modal/);
  assert.match(css, /city-event-card/);
  assert.match(css, /metro-simulator/);
  assert.match(css, /travel-loading-screen/);
  assert.match(css, /side-tabs/);
  assert.match(css, /age-picker/);
  assert.match(css, /metro-pocket-map/);
  assert.match(css, /cafe-shift-screen/);
  assert.match(css, /event-art-night-museum/);
  assert.match(css, /closing-window/);
  assert.match(css, /event-reveal-modal/);
  assert.match(css, /action-transition-screen/);
  assert.match(css, /pixel-metro-map/);
  assert.match(css, /activity-stage/);
  assert.match(css, /day-cycle-transition/);
  assert.match(css, /official-metro-map/);
  assert.match(css, /metro-map-viewport/);
  assert.match(css, /relationship-card/);
  assert.match(css, /dialogue-assignment-reveal/);
  assert.match(css, /travel-cityscape/);
  assert.match(css, /bike-rider/);
  assert.match(css, /walk-backpack/);
  const parsedMap = JSON.parse(metroMap);
  assert.equal(parsedMap.lines.length, 16);
  assert.ok(parsedMap.stations.length >= 300);
  assert.equal(parsedMap.source, "Ile-de-France Mobilites Open Data");
  assert.match(layout, /lang="ru"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
