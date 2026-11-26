// Popup entrypoint for pane mode: arrow keys (or h/j/k/l) move focus between
// the panes of the current tab right away, wrapping around at the edges.
// Enter, Esc or q leave pane mode.

import { call } from "./herdr.ts";
import { planStep } from "./panes-nav.ts";
import type { Dir, PaneApi } from "./panes-nav.ts";
import { decodeKeys } from "./strip.ts";

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
/** Plugin panes that aren't worth stopping on. */
const SKIP_LABELS = new Set(["Typing Madness Meter"]);

interface PaneInfo {
  pane_id: string;
  focused: boolean;
  label?: string;
}

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

async function focusedPane(): Promise<string | null> {
  const panes = (await call<{ panes: PaneInfo[] }>("pane.list")).panes;
  skipIds = new Set(panes.filter((p) => p.label && SKIP_LABELS.has(p.label)).map((p) => p.pane_id));
  return panes.find((p) => p.focused)?.pane_id ?? null;
}

async function step(dir: Dir) {
  const start = await focusedPane();
  if (!start) return;
  const { hops } = await planStep(api, start, dir);
  for (const hop of hops) await call("pane.focus_direction", { pane_id: hop.from, direction: hop.dir });
}

// Keys are handled one at a time, in order, so fast presses never race.
let queue: Promise<void> = Promise.resolve();

function draw() {
  process.stdout.write(`\x1b[H\x1b[2K ${BOLD}PANES${RESET}${DIM}  ←↑↓→ move   enter/esc done${RESET}`);
}

function exit() {
  process.stdout.write("\x1b[?25h" + RESET);
  process.exit(0);
}

process.stdout.write("\x1b[?25l\x1b[2J");
draw();
process.stdin.setRawMode?.(true);
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  for (const key of decodeKeys(chunk)) {
    if (key.kind === "confirm" || key.kind === "cancel") {
      void queue.then(exit);
      return;
    }
    if (key.kind === "left" || key.kind === "right" || key.kind === "up" || key.kind === "down") {
      const dir = key.kind;
      queue = queue.then(() => step(dir)).catch(() => {});
    }
  }
});
process.stdout.on("resize", draw);
