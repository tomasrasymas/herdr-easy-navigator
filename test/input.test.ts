import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_NAME, editText } from "../src/input.ts";

test("printable keys are text, including ones the strip uses as commands", () => {
  assert.deepEqual(editText("", "q1hl nx"), { value: "q1hl nx" });
  assert.deepEqual(editText("ab", "ü🙂"), { value: "abü🙂" });
});

test("backspace removes one character, even a multi-unit one", () => {
  assert.deepEqual(editText("ab🙂", "\x7f"), { value: "ab" });
  assert.deepEqual(editText("ab", "\b\b\b"), { value: "" });
});

test("Ctrl+U clears and Ctrl+W drops the last word", () => {
  assert.deepEqual(editText("my tab", "\x15"), { value: "" });
  assert.deepEqual(editText("my new tab  ", "\x17"), { value: "my new " });
});

test("Enter submits and Esc or Ctrl+C cancels, dropping what follows", () => {
  assert.deepEqual(editText("", "api\rxyz"), { value: "api", done: "submit" });
  assert.deepEqual(editText("api", "\x1b"), { value: "api", done: "cancel" });
  assert.deepEqual(editText("api", "\x03"), { value: "api", done: "cancel" });
});

test("arrow keys and paste markers don't type or cancel", () => {
  assert.deepEqual(editText("a", "\x1b[D\x1bOC\x1b[200~web\x1b[201~"), { value: "aweb" });
});

test("names stop growing at the limit", () => {
  assert.equal(editText("", "x".repeat(MAX_NAME + 10)).value.length, MAX_NAME);
});
