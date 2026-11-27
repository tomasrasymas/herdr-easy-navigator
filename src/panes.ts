// Popup entrypoint for pane mode: arrow keys (or h/j/k/l) move focus between
// the panes of the current tab right away, wrapping around at the edges.
// r splits the focused pane to the right and d splits it downward, focusing
// the new pane. c closes the focused pane after asking (Enter/y close,
// Esc/n keep) and then leaves pane mode. Enter, Esc or q leave pane mode.

import { call, closePane, splitPane } from "./herdr.ts";
import { planStep } from "./panes-nav.ts";
import type { Dir, PaneApi } from "./panes-nav.ts";
import { decodeKeys } from "./strip.ts";

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const WARN = "\x1b[1;31m";
const RESET = "\x1b[0m";
/** Plugin panes that aren't worth stopping on. */
const SKIP_LABELS = new Set(["Typing Madness Meter"]);

interface PaneInfo {
  pane_id: string;
  focused: boolean;
  label?: string;
  cwd?: string;
}

/** Keys that split the focused pane, and where the new pane goes. */
const SPLIT_KEYS: Record<string, "right" | "down"> = { r: "right", d: "down" };

let skipIds = new Set<string>();
const api: PaneApi = {
  async neighbor(paneId, dir) {
    const r = await call<{ neighbor: { neighbor_pane_id?: string | null } }>("pane.neighbor", {
      pane_id: paneId,
      direction: dir,
    });
    return r.neighbor.neighbor_pane_id ?? null;
  },
  skip: (paneId) => skipIds.has(paneId),
};

async function focusedPane(): Promise<PaneInfo | null> {
  const panes = (await call<{ panes: PaneInfo[] }>("pane.list")).panes;
  skipIds = new Set(panes.filter((p) => p.label && SKIP_LABELS.has(p.label)).map((p) => p.pane_id));
  return panes.find((p) => p.focused) ?? null;
}

async function step(dir: Dir) {
  const start = await focusedPane();
  if (!start) return;
  const { hops } = await planStep(api, start.pane_id, dir);
  for (const hop of hops) await call("pane.focus_direction", { pane_id: hop.from, direction: hop.dir });
}

/** Split the focused pane, opening the new one in the same directory. */
async function split(direction: "right" | "down") {
  const pane = await focusedPane();
  if (pane) await splitPane(pane.pane_id, direction, pane.cwd);
}

/** Close the focused pane; herdr moves focus to a neighbor. */
async function close() {
  const pane = await focusedPane();
  if (pane) await closePane(pane.pane_id);
}

// Keys are handled one at a time, in order, so fast presses never race.
let queue: Promise<void> = Promise.resolve();
/** True while asking whether to close the focused pane. */
let confirming = false;

function draw() {
  const line = confirming
    ? `${WARN} close this pane?${RESET}${DIM}   enter/y close   esc/n keep${RESET}`
    : ` ${BOLD}PANES${RESET}${DIM}  ←↑↓→ move  r split right  d split down  c close  esc done${RESET}`;
  process.stdout.write(`\x1b[H\x1b[2K${line}`);
}

function exit() {
  process.stdout.write("\x1b[?25h" + RESET);
  process.exit(0);
}

process.stdout.write("\x1b[?25l\x1b[2J");
draw();
process.stdin.setRawMode?.(true);
process.stdin.setEncoding("utf8");
/** Set once pane mode is on its way out; later keys are ignored. */
let leaving = false;

process.stdin.on("data", (chunk: string) => {
  if (leaving) return;
  for (const key of decodeKeys(chunk)) {
    if (confirming) {
      if (key.kind === "confirm" || (key.kind === "char" && key.ch === "y")) {
        leaving = true;
        void queue.then(close).catch(() => {}).then(exit);
        return;
      } else if (key.kind === "cancel" || (key.kind === "char" && key.ch === "n")) {
        confirming = false;
      }
      continue;
    }
    if (key.kind === "confirm" || key.kind === "cancel") {
      leaving = true;
      void queue.then(exit);
      return;
    }
    if (key.kind === "left" || key.kind === "right" || key.kind === "up" || key.kind === "down") {
      const dir = key.kind;
      queue = queue.then(() => step(dir)).catch(() => {});
    } else if (key.kind === "char" && SPLIT_KEYS[key.ch]) {
      const direction = SPLIT_KEYS[key.ch];
      queue = queue.then(() => split(direction)).catch(() => {});
    } else if (key.kind === "char" && key.ch === "c") {
      confirming = true;
    }
  }
  draw();
});
process.stdout.on("resize", draw);
