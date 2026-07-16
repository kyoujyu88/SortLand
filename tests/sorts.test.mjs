import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildSortOperations } from "../lib/sorts.ts";

const algorithmIds = [
  "bubble", "selection", "insertion", "merge", "quick", "heap", "shell",
  "counting", "radix", "cocktail", "comb", "gnome", "oddEven", "cycle",
  "pancake", "bucket", "tim", "strand", "stooge", "intro",
];

function applyOperations(input, operations) {
  const values = [...input];
  for (const operation of operations) {
    if (operation.type === "swap") {
      const [a, b] = operation.indices;
      [values[a], values[b]] = [values[b], values[a]];
    } else if (operation.type === "write") {
      values[operation.index] = operation.value;
    }
  }
  return values;
}

test("all 20 visualizers produce a sorted result", () => {
  for (const id of algorithmIds) {
    const size = id === "stooge" ? 14 : 32;
    const input = Array.from({ length: size }, (_, i) => ((i * 17 + 11) % size) + 1);
    const expected = [...input].sort((a, b) => a - b);
    const actual = applyOperations(input, buildSortOperations(id, input));
    assert.deepEqual(actual, expected, `${id} should sort ascending`);
  }
});

test("the product contains the complete character roster and GitHub Pages workflow", async () => {
  const [algorithms, workflow, page] = await Promise.all([
    readFile(new URL("../lib/algorithms.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal((algorithms.match(/id: "/g) ?? []).length, 20);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(page, /SortLab/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
});
