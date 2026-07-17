import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildPianoSweep, getCompletionSweepTiming } from "../lib/completion.ts";
import { ALGORITHM_EXPLANATIONS } from "../lib/explanations.ts";
import { buildSortOperations } from "../lib/sorts.ts";

const algorithmIds = [
  "bubble", "selection", "insertion", "merge", "quick", "heap", "shell",
  "counting", "radix", "cocktail", "comb", "gnome", "oddEven", "cycle",
  "pancake", "bucket", "tim", "strand", "stooge", "intro", "bogo",
  "bitonic", "circle", "bead", "tournament", "tree",
];

function applyOperations(input, operations) {
  const values = [...input];
  for (const operation of operations) {
    if (operation.type === "swap") {
      const [a, b] = operation.indices;
      [values[a], values[b]] = [values[b], values[a]];
    } else if (operation.type === "write") {
      values[operation.index] = operation.value;
    } else if (operation.type === "shuffle") {
      values.splice(0, values.length, ...operation.values);
    }
  }
  return values;
}

test("all 26 visualizers produce a sorted result", () => {
  for (const id of algorithmIds) {
    const size = id === "stooge" ? 14 : id === "bogo" ? 6 : 32;
    const input = Array.from({ length: size }, (_, i) => ((i * 17 + 11) % size) + 1);
    const expected = [...input].sort((a, b) => a - b);
    const actual = applyOperations(input, buildSortOperations(id, input));
    assert.deepEqual(actual, expected, `${id} should sort ascending`);
  }
});

test("the six new visualizers handle their supported shapes and limits", () => {
  const cases = {
    bogo: [5, 6],
    bitonic: [8, 16, 32],
    circle: [8, 17, 33],
    bead: [8, 21, 40],
    tournament: [8, 19, 37],
    tree: [8, 20, 36],
  };

  for (const [id, sizes] of Object.entries(cases)) {
    for (const size of sizes) {
      const ordered = Array.from({ length: size }, (_, index) => index + 1);
      const input = ordered.slice(3).concat(ordered.slice(0, 3)).reverse();
      const operations = buildSortOperations(id, input);
      assert.deepEqual(applyOperations(input, operations), ordered, `${id} should sort n=${size}`);
      if (id === "bogo") {
        assert.ok(
          operations.filter((operation) => operation.type === "shuffle").length <= 12_000,
          "bogo should respect its browser safety cap",
        );
      }
    }
  }
});

test("the completion sweep climbs from the smallest bar to the largest", () => {
  for (const size of [8, 48, 160]) {
    const notes = buildPianoSweep(size);
    const timing = getCompletionSweepTiming(size);
    assert.equal(notes[0].barIndex, 0);
    assert.equal(notes.at(-1).barIndex, size - 1);
    assert.ok(notes.length <= 29);
    assert.ok(timing.durationMs < 1900);
    for (let index = 1; index < notes.length; index++) {
      assert.ok(notes[index].barIndex > notes[index - 1].barIndex);
      assert.ok(notes[index].frequency > notes[index - 1].frequency);
      assert.ok(notes[index].delayMs > notes[index - 1].delayMs);
    }
  }
});

test("every algorithm has a complete detailed learning guide", () => {
  assert.deepEqual(Object.keys(ALGORITHM_EXPLANATIONS).sort(), [...algorithmIds].sort());
  for (const id of algorithmIds) {
    const guide = ALGORITHM_EXPLANATIONS[id];
    assert.ok(guide.overview.length >= 40, `${id} should have a useful overview`);
    assert.ok(guide.steps.length >= 3, `${id} should explain its process in steps`);
    assert.ok(guide.watch.length >= 25, `${id} should include a visual observation point`);
    assert.ok(guide.goodFor.length >= 25, `${id} should explain where it works well`);
    assert.ok(guide.caution.length >= 25, `${id} should explain its tradeoffs`);
  }
});

test("the product contains the complete character roster and GitHub Pages workflow", async () => {
  const [algorithms, workflow, page, lab, styles, newCharacters] = await Promise.all([
    readFile(new URL("../lib/algorithms.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SortLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/sort-characters-new.webp", import.meta.url)),
  ]);
  assert.equal((algorithms.match(/id: "/g) ?? []).length, 26);
  assert.equal(algorithmIds.length, 26);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(page, /SortLab/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.doesNotMatch(lab, /Math\.max\(2\.5/);
  assert.match(lab, /height: `\$\{\(value \/ maxValue\) \* 100\}%`/);
  assert.match(lab, /playCompletionSweep/);
  assert.match(lab, /strikePianoKey/);
  assert.match(lab, /strikeSteelPan/);
  assert.match(lab, /sort-characters-new\.webp/);
  assert.match(lab, /allowedCounts/);
  assert.match(lab, /詳しい解説を見る/);
  assert.match(lab, /aria-expanded=\{isDetailsOpen\}/);
  assert.match(styles, /\.detail-panel\s*\{/);
  assert.match(styles, /\.character-icon\s*\{[^}]*display:\s*block/s);
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\) 100px/);
  assert.ok(newCharacters.byteLength > 50_000);
});
