import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeKeys, layoutStrip, move } from "../src/strip.ts";

test("decodes arrows in both cursor modes, h/l, digits, confirm and cancel", () => {
  assert.deepEqual(decodeKeys("\x1b[D\x1bOC"), [{ kind: "left" }, { kind: "right" }]);
  assert.deepEqual(decodeKeys("hl"), [{ kind: "left" }, { kind: "right" }]);
  assert.deepEqual(decodeKeys("3"), [{ kind: "jump", index: 2 }]);
  assert.deepEqual(decodeKeys("\r"), [{ kind: "confirm" }]);
  assert.deepEqual(decodeKeys("\x1b"), [{ kind: "cancel" }]);
  assert.deepEqual(decodeKeys("q"), [{ kind: "cancel" }]);
});

test("several arrows in one chunk are all kept", () => {
  assert.equal(decodeKeys("\x1b[C\x1b[C\x1b[C").length, 3);
});

test("up/down arrows and j/k decode, and don't read as Esc", () => {
  assert.deepEqual(decodeKeys("\x1b[A\x1b[B"), [{ kind: "up" }, { kind: "down" }]);
  assert.deepEqual(decodeKeys("kj"), [{ kind: "up" }, { kind: "down" }]);
});

test("up/down don't move the tab selection", () => {
  assert.equal(move(2, 4, { kind: "up" }), 2);
  assert.equal(move(2, 4, { kind: "down" }), 2);
});

test("moves wrap at both ends", () => {
  assert.equal(move(0, 4, { kind: "left" }), 3);
  assert.equal(move(3, 4, { kind: "right" }), 0);
  assert.equal(move(1, 4, { kind: "right" }), 2);
});

test("jumps past the last tab stay put; confirm and cancel return null", () => {
  assert.equal(move(1, 3, { kind: "jump", index: 5 }), 1);
  assert.equal(move(1, 3, { kind: "jump", index: 2 }), 2);
  assert.equal(move(1, 3, { kind: "confirm" }), null);
  assert.equal(move(1, 3, { kind: "cancel" }), null);
});

test("everything fits: no scroll markers", () => {
  const r = layoutStrip(["api", "web", "logs"], 1, 80);
  assert.equal(r.cells.length, 3);
  assert.equal(r.moreLeft || r.moreRight, false);
  assert.equal(r.cells[1].selected, true);
});

test("too many tabs: the selected one stays visible and cut-offs are flagged", () => {
  const labels = Array.from({ length: 20 }, (_, i) => `tab-number-${i}`);
  const r = layoutStrip(labels, 15, 60);
  assert.ok(r.cells.some((c) => c.selected && c.text.includes("16 tab-number-15")));
  assert.equal(r.moreLeft, true);
  const width = r.cells.reduce((n, c) => n + c.text.length + 1, 0);
  assert.ok(width <= 60);
});

test("long labels are shortened", () => {
  const r = layoutStrip(["a".repeat(60)], 0, 80);
  assert.ok(r.cells[0].text.length < 30);
  assert.ok(r.cells[0].text.includes("…"));
});
