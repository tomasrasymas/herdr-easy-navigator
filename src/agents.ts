// Popup entrypoint: a list of every agent across all workspaces. Up/down (or
// k/j) and 1-9 move the selection; Enter jumps to the selected agent's pane
// and closes, Esc/q close without moving.

import { focusAgent, listAgents, listTabs, listWorkspaces } from "./herdr.ts";
import type { Agent } from "./herdr.ts";
import { decodeKeys } from "./strip.ts";
import { moveList, rowText, scrollStart, whereColumn } from "./list.ts";
import type { AgentRow } from "./list.ts";

const RESET = "\x1b[0m";
const SELECTED = "\x1b[1;7m";
const DIM = "\x1b[2m";
const STATUS: Record<string, { mark: string; color: string }> = {
  working: { mark: "●", color: "\x1b[33m" },
  blocked: { mark: "▲", color: "\x1b[31m" },
  done: { mark: "✓", color: "\x1b[32m" },
  idle: { mark: "○", color: "\x1b[2m" },
};

let agents: Agent[] = [];
let rows: AgentRow[] = [];
let selected = 0;

/** Label each agent with "workspace › tab" and its terminal title. */
async function loadRows(): Promise<void> {
  const [workspaces, list] = await Promise.all([listWorkspaces(), listAgents()]);
  agents = list;
  const wsIds = [...new Set(agents.map((a) => a.workspace_id))];
  const tabLists = await Promise.all(wsIds.map((id) => listTabs(id).catch(() => [])));
  const tabLabel = new Map(tabLists.flat().map((t) => [t.tab_id, t.label]));
  const wsLabel = new Map(workspaces.map((w) => [w.workspace_id, w.label]));
  rows = agents.map((a) => {
    const ws = wsLabel.get(a.workspace_id) ?? a.workspace_id;
    const tab = tabLabel.get(a.tab_id);
    return {
      where: tab ? `${ws} › ${tab}` : ws,
      title: a.name ?? a.terminal_title_stripped ?? a.agent,
      status: a.agent_status,
    };
  });
}

function draw() {
  const width = process.stdout.columns || 80;
  const height = Math.max(2, process.stdout.rows || 12);
  const visible = height - 1; // last line is the key hint
  const start = scrollStart(selected, rows.length, visible);
  const textWidth = width - 4; // space for the selection pointer and status mark
  const whereWidth = whereColumn(rows, textWidth);
  let out = "\x1b[H";
  for (let line = 0; line < visible; line++) {
    const i = start + line;
    out += "\x1b[2K";
    const row = rows[i];
    if (row) {
      const s = STATUS[row.status] ?? { mark: "?", color: DIM };
      const text = rowText(row, i, whereWidth, textWidth);
      const pointer = i === selected ? "▸" : " ";
      const body = i === selected ? SELECTED + text + RESET : text;
      out += `${pointer}${s.color}${s.mark}${RESET} ${body}`;
    } else if (line === 0) {
      out += DIM + " no agents running" + RESET;
    }
    out += "\r\n";
  }
  const more = rows.length > visible ? `   ${selected + 1}/${rows.length}` : "";
  out += "\x1b[2K" + DIM + ` ↑/↓ select   enter go   esc cancel${more}` + RESET;
  process.stdout.write(out);
}

let going = false;

/** Jump to the selected agent (unless it's already focused) and close. */
async function go() {
  if (going) return;
  going = true;
  const agent = agents[selected];
  if (agent && !agent.focused) await focusAgent(agent.pane_id).catch(() => {});
  exit();
}

function exit() {
  process.stdout.write("\x1b[?25h" + RESET);
  process.exit(0);
}

async function main() {
  process.stdout.write("\x1b[?25l\x1b[2J");
  await loadRows();
  selected = Math.max(0, agents.findIndex((a) => a.focused));
  draw();

  process.stdin.setRawMode?.(true);
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    for (const key of decodeKeys(chunk)) {
      if (key.kind === "confirm") return void go();
      const next = moveList(selected, agents.length, key);
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
