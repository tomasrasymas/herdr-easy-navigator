import assert from "node:assert/strict";
import { test } from "node:test";
import { planStep } from "../src/panes-nav.ts";
import type { Dir, PaneApi } from "../src/panes-nav.ts";

/** A fake layout from a neighbor table: { pane: { dir: neighbor } }. */
function grid(table: Record<string, Partial<Record<Dir, string>>>, skip: string[] = []): PaneApi {
  return {
    neighbor: async (id, dir) => table[id]?.[dir] ?? null,
    skip: (id) => skip.includes(id),
  };
}

// A | B | C side by side.
const row = grid({
  A: { right: "B" },
  B: { left: "A", right: "C" },
  C: { left: "B" },
});

test("moves to the neighbor in one hop", async () => {
  const r = await planStep(row, "A", "right");
  assert.equal(r.end, "B");
  assert.deepEqual(r.hops, [{ from: "A", dir: "right" }]);
});

test("wraps around at the edge by walking to the far side", async () => {
  const r = await planStep(row, "C", "right");
  assert.equal(r.end, "A");
  assert.deepEqual(r.hops, [
    { from: "C", dir: "left" },
    { from: "B", dir: "left" },
  ]);
});

test("a single pane, or nothing along that axis, stays put", async () => {
  assert.deepEqual(await planStep(grid({ A: {} }), "A", "left"), { hops: [], end: "A" });
  assert.deepEqual(await planStep(row, "B", "up"), { hops: [], end: "B" });
});

test("skipped panes are passed over", async () => {
  // A above M (the meter) above B.
  const col = grid({ A: { down: "M" }, M: { up: "A", down: "B" }, B: { up: "M" } }, ["M"]);
  const r = await planStep(col, "A", "down");
  assert.equal(r.end, "B");
  assert.equal(r.hops.length, 2);
});

test("a skipped pane at the edge wraps around to the far side", async () => {
  // A above M: down from A lands on M, which is skipped; M has nothing below,
  // so it wraps back up to A, which is the start, so nothing moves.
  const col = grid({ A: { down: "M" }, M: { up: "A" } }, ["M"]);
  assert.deepEqual(await planStep(col, "A", "down"), { hops: [], end: "A" });
});

test("never loops forever when everything else is skipped", async () => {
  const ring = grid({ A: { right: "M" }, M: { left: "A", right: "N" }, N: { left: "M" } }, ["M", "N"]);
  const r = await planStep(ring, "A", "right");
  assert.equal(r.end, "A");
});
