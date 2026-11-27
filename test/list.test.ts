import assert from "node:assert/strict";
import { test } from "node:test";
import { fit, moveList, rowText, scrollStart, whereColumn } from "../src/list.ts";

test("up/down move the selection and wrap at both ends", () => {
  assert.equal(moveList(1, 4, { kind: "down" }), 2);
  assert.equal(moveList(1, 4, { kind: "up" }), 0);
  assert.equal(moveList(0, 4, { kind: "up" }), 3);
  assert.equal(moveList(3, 4, { kind: "down" }), 0);
});

test("left/right don't move the list selection", () => {
  assert.equal(moveList(2, 4, { kind: "left" }), 2);
  assert.equal(moveList(2, 4, { kind: "right" }), 2);
});

test("jumps, first/last, confirm and cancel behave like the tab strip", () => {
  assert.equal(moveList(0, 4, { kind: "jump", index: 2 }), 2);
  assert.equal(moveList(0, 4, { kind: "jump", index: 7 }), 0);
  assert.equal(moveList(2, 4, { kind: "first" }), 0);
  assert.equal(moveList(0, 4, { kind: "last" }), 3);
  assert.equal(moveList(0, 4, { kind: "cancel" }), null);
  assert.equal(moveList(0, 0, { kind: "down" }), null);
});

test("short lists never scroll", () => {
  assert.equal(scrollStart(3, 5, 10), 0);
});

test("long lists scroll to keep the selection near the middle, clamped at the ends", () => {
  assert.equal(scrollStart(0, 30, 10), 0);
  assert.equal(scrollStart(15, 30, 10), 10);
  assert.equal(scrollStart(29, 30, 10), 20);
});

test("fit truncates with an ellipsis", () => {
  assert.equal(fit("hello", 10), "hello");
  assert.equal(fit("hello world", 6), "hello…");
  assert.equal(fit("hello", 1), "…");
  assert.equal(fit("hello", 0), "");
});

test("rows pad the location column and stay within the width", () => {
  const row = { where: "ws › tab", title: "Claude Code", status: "idle" };
  assert.equal(rowText(row, 0, 10, 80), "1 ws › tab    Claude Code");
  assert.equal(rowText(row, 0, 10, 12).length, 12);
  assert.equal(rowText(row, 9, 10, 80).startsWith("  ws"), true);
});

test("location column fits the longest label, capped at half the width", () => {
  const rows = [
    { where: "short", title: "", status: "idle" },
    { where: "a much longer workspace › tab", title: "", status: "idle" },
  ];
  assert.equal(whereColumn(rows, 200), 29);
  assert.equal(whereColumn(rows, 40), 20);
});
