// Popup entrypoint: a strip of the current workspace's tabs, followed by
// "n new", "r rename" and "c close" actions, each labelled with its key.
// Left/right (or h/l) and 1-9 move the selection; Enter switches to the
// selected tab or runs the selected action, n/r/c run the actions directly,
// Esc/q close without switching.
// New and rename ask for the tab's name first; close asks for confirmation.

import { closeTab, createTab, focusTab, focusedWorkspace, listPanes, listTabs, renameTab } from "./herdr.ts";
import type { Tab } from "./herdr.ts";
import { editText } from "./input.ts";
import { decodeKeys, layoutStrip, move } from "./strip.ts";
import type { Key } from "./strip.ts";

const RESET = "\x1b[0m";
const SELECTED = "\x1b[1;7m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const WARN = "\x1b[1;31m";
const CURSOR = "\x1b[7m \x1b[27m";
const ACTIONS = ["n new", "r rename", "c close"];

/** What the second line is asking, if anything. */
type Prompt =
  | { kind: "close"; tab: Tab }
  | { kind: "new"; name: string }
  | { kind: "rename"; tab: Tab; name: string };

let workspace = "";
let tabs: Tab[] = [];
let selected = 0;
let prompt: Prompt | null = null;

const newIndex = () => tabs.length;
const renameIndex = () => tabs.length + 1;
const closeIndex = () => tabs.length + 2;

/** `label: name█   help`, keeping the end of a long name in view. */
function nameLine(label: string, name: string, help: string, width: number): string {
  const room = Math.max(8, width - label.length - help.length - 4);
  const chars = Array.from(name);
  const shown = chars.length > room ? "…" + chars.slice(chars.length - room + 1).join("") : name;
  return BOLD + ` ${label} ` + RESET + shown + CURSOR + DIM + help + RESET;
}

function hintLine(width: number): string {
  if (!prompt) return DIM + " ←/→ select   enter go   esc cancel" + RESET;
  if (prompt.kind === "close") {
    return WARN + ` close tab "${prompt.tab.label || "tab"}"?` + RESET + DIM + "   enter/y close   esc/n keep" + RESET;
  }
  if (prompt.kind === "new") return nameLine("new tab name:", prompt.name, "   enter create   esc cancel", width);
  return nameLine(`rename "${prompt.tab.label || "tab"}" to:`, prompt.name, "   enter save   esc cancel", width);
}

function draw() {
  const width = process.stdout.columns || 80;
  const { cells, moreLeft, moreRight } = layoutStrip(
    tabs.map((t) => t.label),
    selected,
    width,
    ACTIONS,
  );
  const strip = cells.map((c) => (c.selected ? SELECTED + c.text + RESET : c.text)).join(" ");
  const left = moreLeft ? DIM + "‹ " + RESET : "  ";
  const right = moreRight ? DIM + " ›" + RESET : "";
  process.stdout.write(`\x1b[H\x1b[2K${left}${strip}${right}\r\n\x1b[2K${hintLine(width)}`);
}

let busy = false;

/** Run one herdr change at most, then close the popup. */
async function finish(work: () => Promise<void>) {
  if (busy) return;
  busy = true;
  await work().catch(() => {});
  exit();
}

/** Switch to the selected tab (unless it's already active) and close. */
function go() {
  const tab = tabs[selected];
  return finish(async () => {
    if (tab && !tab.focused) await focusTab(tab.tab_id);
  });
}

/** Open a new tab called `name` in the current pane's directory and switch to it. */
function newTab(name: string) {
  return finish(async () => {
    const here = (await listPanes().catch(() => [])).find((p) => p.focused && p.workspace_id === workspace);
    await createTab(workspace, name, here?.cwd);
  });
}

/** The highlighted tab, or the active one when an action is highlighted. */
function targetTab(): Tab | null {
  return tabs[selected] ?? tabs.find((t) => t.focused) ?? null;
}

function askRename() {
  const tab = targetTab();
  if (tab) prompt = { kind: "rename", tab, name: tab.label };
}

function askClose() {
  const tab = targetTab();
  if (tab) prompt = { kind: "close", tab };
}

function exit() {
  process.stdout.write("\x1b[?25h" + RESET);
  process.exit(0);
}

/** Handle one key while asking whether to close a tab. */
function onConfirmKey(key: Key, tab: Tab) {
  if (key.kind === "confirm" || (key.kind === "char" && key.ch === "y")) {
    void finish(() => closeTab(tab.tab_id));
  } else if (key.kind === "cancel" || (key.kind === "char" && key.ch === "n")) {
    prompt = null;
  }
}

/** Feed raw input to the name field; Enter creates or renames, Esc goes back to the strip. */
function onNameInput(chunk: string, p: Extract<Prompt, { name: string }>) {
  const { value, done } = editText(p.name, chunk);
  p.name = value;
  if (done === "cancel") {
    prompt = null;
    return;
  }
  if (done !== "submit") return;
  const name = value.trim();
  if (!name) return; // a tab needs a name: keep asking
  if (p.kind === "new") void newTab(name);
  else if (name === p.tab.label) exit();
  else void finish(() => renameTab(p.tab.tab_id, name));
}

/** Handle one key on the strip. */
function onKey(key: Key) {
  if (key.kind === "confirm") {
    if (selected === newIndex()) prompt = { kind: "new", name: "" };
    else if (selected === renameIndex()) askRename();
    else if (selected === closeIndex()) askClose();
    else void go();
    return;
  }
  if (key.kind === "char") {
    if (key.ch === "n") prompt = { kind: "new", name: "" };
    else if (key.ch === "r") askRename();
    else if (key.ch === "c") askClose();
    return;
  }
  // 1-9 pick tabs only, never the actions.
  if (key.kind === "jump" && key.index >= tabs.length) return;
  const next = move(selected, tabs.length + ACTIONS.length, key);
  if (next === null) exit();
  else selected = next;
}

async function main() {
  process.stdout.write("\x1b[?25l\x1b[2J");
  workspace = process.env.HERDR_WORKSPACE_ID ?? (await focusedWorkspace()) ?? "";
  if (!workspace) return exit();
  tabs = await listTabs(workspace);
  selected = Math.max(0, tabs.findIndex((t) => t.focused));
  draw();

  process.stdin.setRawMode?.(true);
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    if (busy) return;
    if (prompt && prompt.kind !== "close") {
      // Typing a name: every printable key is text, so skip the strip's key map.
      onNameInput(chunk, prompt);
    } else {
      for (const key of decodeKeys(chunk)) {
        if (prompt?.kind === "close") onConfirmKey(key, prompt.tab);
        else onKey(key);
        if (busy) return; // a switch, new tab or close is under way
        if (prompt && prompt.kind !== "close") break; // the rest of the chunk isn't a name
      }
    }
    if (!busy) draw();
  });
  process.stdout.on("resize", draw);
}

main().catch((err) => {
  process.stderr.write(String(err?.message ?? err) + "\n");
  exit();
});
