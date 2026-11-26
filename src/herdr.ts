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
    const id = `tabnav_${process.pid}_${++seq}`;
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
