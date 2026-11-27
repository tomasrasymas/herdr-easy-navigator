// Minimal herdr socket client: newline-delimited JSON, one request per
// connection.

import net from "node:net";
import os from "node:os";
import path from "node:path";

const SOCKET_PATH =
  process.env.HERDR_SOCKET_PATH ?? path.join(os.homedir(), ".config", "herdr", "herdr.sock");

let seq = 0;

export function call<T = any>(method: string, params: object = {}, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = `easynav_${process.pid}_${++seq}`;
    const sock = net.createConnection(SOCKET_PATH);
    let buf = "";
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sock.destroy();
      fn();
    };
    const timer = setTimeout(() => finish(() => reject(new Error(`${method} timed out`))), timeoutMs);
    sock.setEncoding("utf8");
    sock.on("connect", () => sock.write(JSON.stringify({ id, method, params }) + "\n"));
    sock.on("data", (chunk: string) => {
      buf += chunk;
      const nl = buf.indexOf("\n");
      if (nl < 0) return;
      const msg = JSON.parse(buf.slice(0, nl));
      if (msg.error) finish(() => reject(new Error(`${msg.error.code}: ${msg.error.message}`)));
      else finish(() => resolve(msg.result as T));
    });
    sock.on("error", (err) => finish(() => reject(err)));
    sock.on("close", () => finish(() => reject(new Error(`${method}: connection closed`))));
  });
}

export interface Tab {
  tab_id: string;
  label: string;
  focused: boolean;
}

export async function focusedWorkspace(): Promise<string | null> {
  const r = await call<{ workspaces: { workspace_id: string; focused: boolean }[] }>("workspace.list");
  return r.workspaces.find((w) => w.focused)?.workspace_id ?? null;
}

export async function listTabs(workspaceId: string): Promise<Tab[]> {
  const r = await call<{ tabs: Tab[] }>("tab.list", { workspace_id: workspaceId });
  return r.tabs;
}

export async function focusTab(tabId: string): Promise<void> {
  await call("tab.focus", { tab_id: tabId });
}

export interface Workspace {
  workspace_id: string;
  label: string;
  focused: boolean;
}

export interface Agent {
  pane_id: string;
  workspace_id: string;
  tab_id: string;
  agent: string;
  name?: string;
  agent_status: string;
  focused: boolean;
  cwd?: string;
  terminal_title_stripped?: string;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const r = await call<{ workspaces: Workspace[] }>("workspace.list");
  return r.workspaces;
}

export async function listAgents(): Promise<Agent[]> {
  const r = await call<{ agents: Agent[] }>("agent.list");
  return r.agents;
}

/** Focus an agent's pane, switching workspace and tab as needed. */
export async function focusAgent(paneId: string): Promise<void> {
  await call("agent.focus", { target: paneId });
}

export interface Pane {
  pane_id: string;
  tab_id: string;
  workspace_id: string;
  focused: boolean;
  label?: string;
  cwd?: string;
}

export async function listPanes(): Promise<Pane[]> {
  const r = await call<{ panes: Pane[] }>("pane.list");
  return r.panes;
}

/** Open a new tab named `label` in `workspaceId` and switch to it. */
export async function createTab(workspaceId: string, label: string, cwd?: string): Promise<void> {
  await call("tab.create", { workspace_id: workspaceId, label, focus: true, cwd: cwd ?? null });
}

export async function renameTab(tabId: string, label: string): Promise<void> {
  await call("tab.rename", { tab_id: tabId, label });
}

export async function closeTab(tabId: string): Promise<void> {
  await call("tab.close", { tab_id: tabId });
}

/** Split `paneId`, putting the new pane to its right or below it, and focus the new pane. */
export async function splitPane(paneId: string, direction: "right" | "down", cwd?: string): Promise<void> {
  await call("pane.split", { target_pane_id: paneId, direction, focus: true, cwd: cwd ?? null });
}

export async function closePane(paneId: string): Promise<void> {
  await call("pane.close", { pane_id: paneId });
}
