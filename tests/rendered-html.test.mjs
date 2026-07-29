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
  const [page, layout, css, packageJson, metroMap, readme] = await Promise.all([
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("app/globals.css", projectRoot), "utf8"),
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("app/game/paris-metro-schematic.json", projectRoot), "utf8"),
    readFile(new URL("README.md", projectRoot), "utf8"),
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
  assert.match(page, /scenePopulation/);
  assert.match(page, /AmbientPerson/);
  assert.match(page, /portraitPresets/);
  assert.match(page, /startHour/);
  assert.match(page, /endHour/);
  assert.match(page, /cityEventStatus/);
  assert.match(page, /completedActionIds/);
  assert.match(page, /dialoguePendingRelationship/);
  assert.match(page, /weekSchedule/);
  assert.match(page, /currentWeekday/);
  assert.match(page, /dialogueVisibleText/);
  assert.match(page, /dialogueTurnPhase/);
  assert.match(page, /recentCafeOrderIds/);
  assert.match(page, /shuffleItems/);
  assert.match(page, /leaveCafeShiftEarly/);
  assert.match(page, /showCafeShiftLeaveConfirm/);
  assert.match(page, /map-location-\$\{location\.id\}/);
  assert.match(page, /Событие дня «\$\{currentCityEvent\.title\}»/);
  assert.match(page, /activeCafeShift\?: ActiveCafeShift/);
  assert.match(page, /DialogueLineText/);
  assert.match(page, /cafeShiftLeaveDialogRef/);
  assert.match(page, /inert=\{!!activeCafeShift/);
  assert.match(page, /ОБЯЗАННОСТИ НА СЕГОДНЯ/);
  assert.match(page, /parisDistricts/);
  assert.match(page, /BOULEVARD PÉRIPHÉRIQUE/);
  assert.match(page, /metro-map-floating-controls/);
  assert.match(page, /focusCurrentStation/);
  assert.match(page, /focusRoute/);
  assert.doesNotMatch(page, /className="metro-line metro-(?:red|blue|gold)"/);
  assert.doesNotMatch(page, /Продолжить разговор/);
  assert.doesNotMatch(page, /dialogue-auto-next/);
  assert.doesNotMatch(page, /<blockquote>«\{activeDialogueRound\.prompt\}»<\/blockquote>/);
  assert.match(page, /metroSchematic/);
  assert.doesNotMatch(page, /РАЗГОВОР \{activeDialogueIndex \+ 1\} ИЗ/);
  assert.doesNotMatch(page, /type="range"/);
  assert.doesNotMatch(page, /Разобрать письма|Приготовить ужин/);
  assert.doesNotMatch(page, /sort\(\(\) => Math\.random\(\) - 0\.5\)/);
  assert.doesNotMatch(page, /window\.confirm/);
  const cafePoolSource = page.slice(page.indexOf("const cafeOrderPool"), page.indexOf("function shuffleItems"));
  const cafeOrderIds = [...cafePoolSource.matchAll(/\n\s+id: "([^"]+)"/g)].map((match) => match[1]);
  assert.ok(cafeOrderIds.length >= 20);
  assert.equal(new Set(cafeOrderIds).size, cafeOrderIds.length);
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
  assert.match(css, /scene-extra/);
  assert.match(css, /extra-ground-shadow/);
  assert.match(css, /event-schedule/);
  assert.match(css, /portrait-hair-curls/);
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
  assert.match(css, /paris-city-boundary/);
  assert.match(css, /arrondissement-marker/);
  assert.match(css, /week-agenda-card/);
  assert.match(css, /week-duty\.late/);
  assert.match(css, /metro-map-floating-controls/);
  assert.match(css, /dialogue-typewriter-text/);
  assert.match(css, /vnBustTalk/);
  assert.match(css, /clip-path:none!important/);
  assert.match(css, /ambientPatronCross/);
  assert.match(css, /shiftGuestIdle/);
  assert.match(css, /cafe-shift-leave-dialog/);
  assert.match(css, /dialogue-narration-text/);
  assert.match(css, /\.scene-time-dawn/);
  assert.match(css, /\.scene-time-day/);
  assert.match(css, /\.scene-time-sunset/);
  assert.match(css, /\.scene-time-night/);
  assert.match(css, /@container paris-map/);
  assert.match(css, /\.map-location-montmartre/);
  assert.doesNotMatch(page, /og\.png/);
  assert.doesNotMatch(layout, /og\.png/);
  assert.doesNotMatch(css, /url\(['"]?\/og\.png/);
  assert.match(readme, /!\[Paris, Nouvelle Vie — pixel-art preview\]\(\.\/public\/og\.png\)/);
  const parsedMap = JSON.parse(metroMap);
  assert.equal(parsedMap.lines.length, 16);
  assert.ok(parsedMap.stations.length >= 300);
  assert.equal(parsedMap.source, "Ile-de-France Mobilites Open Data");
  assert.match(layout, /lang="ru"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
