// Popup entrypoint: a strip of the current workspace's tabs. Left/right (or
// h/l) and 1-9 move the selection; Enter switches to the selected tab and
// closes, Esc/q close without switching.

import { focusTab, focusedWorkspace, listTabs } from "./herdr.ts";
import type { Tab } from "./herdr.ts";
import { decodeKeys, layoutStrip, move } from "./strip.ts";

const RESET = "\x1b[0m";
const SELECTED = "\x1b[1;7m";
const DIM = "\x1b[2m";

let tabs: Tab[] = [];
let selected = 0;

function draw() {
  const width = process.stdout.columns || 80;
  const { cells, moreLeft, moreRight } = layoutStrip(
    tabs.map((t) => t.label),
    selected,
    width,
  );
  const strip = cells.map((c) => (c.selected ? SELECTED + c.text + RESET : c.text)).join(" ");
  const left = moreLeft ? DIM + "‹ " + RESET : "  ";
  const right = moreRight ? DIM + " ›" + RESET : "";
  const hint = DIM + " ←/→ select   enter go   esc cancel" + RESET;
  process.stdout.write(`\x1b[H\x1b[2K${left}${strip}${right}\r\n\x1b[2K${hint}`);
}

let going = false;

/** Switch to the selected tab (unless it's already active) and close. */
async function go() {
  if (going) return;
  going = true;
  const tab = tabs[selected];
  if (tab && !tab.focused) await focusTab(tab.tab_id).catch(() => {});
  exit();
}

function exit() {
  process.stdout.write("\x1b[?25h" + RESET);
  process.exit(0);
}

async function main() {
  process.stdout.write("\x1b[?25l\x1b[2J");
  const workspace = process.env.HERDR_WORKSPACE_ID ?? (await focusedWorkspace());
  if (!workspace) return exit();
  tabs = await listTabs(workspace);
  selected = Math.max(0, tabs.findIndex((t) => t.focused));
  draw();

  process.stdin.setRawMode?.(true);
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    for (const key of decodeKeys(chunk)) {
      if (key.kind === "confirm") return void go();
      const next = move(selected, tabs.length, key);
      if (next === null) return exit();
      selected = next;
    }
    draw();
  });
  process.stdout.on("resize", draw);
}

main().catch((err) => {
  process.stderr.write(String(err?.message ?? err) + "\n");
  exit();
});
