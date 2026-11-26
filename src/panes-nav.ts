// Moving focus between the panes of a tab with wrap-around.
//
// herdr can only move focus one neighbor at a time (pane.focus_direction), so
// a step at the edge of the tab walks back across to the far side instead.

export type Dir = "left" | "right" | "up" | "down";

export const OPPOSITE: Record<Dir, Dir> = { left: "right", right: "left", up: "down", down: "up" };

export interface PaneApi {
  /** The pane next to `paneId` in `dir`, or null at the edge. */
  neighbor(paneId: string, dir: Dir): Promise<string | null>;
  /** Panes to pass over, like the Typing Madness Meter. */
  skip?(paneId: string): boolean;
}

export interface Hop {
  from: string;
  dir: Dir;
}

const MAX_HOPS = 64;

/**
 * The focus moves that take one step from `start` in `dir`: to the neighbor,
 * or around to the far side at the edge. Skipped panes are passed over.
 * Returns the hops (each a pane.focus_direction call) and where they end.
 */
export async function planStep(api: PaneApi, start: string, dir: Dir): Promise<{ hops: Hop[]; end: string }> {
  const hops: Hop[] = [];
  let cur = start;
  while (hops.length < MAX_HOPS) {
    const next = await api.neighbor(cur, dir);
    if (next) {
      hops.push({ from: cur, dir });
      cur = next;
    } else {
      // At the edge: walk to the far side.
      const back = OPPOSITE[dir];
      let moved = false;
      for (let n = await api.neighbor(cur, back); n && hops.length < MAX_HOPS; n = await api.neighbor(cur, back)) {
        hops.push({ from: cur, dir: back });
        cur = n;
        moved = true;
      }
      if (!moved) break; // nothing else along this axis
    }
    if (cur === start || !api.skip?.(cur)) break;
  }
  if (cur === start) return { hops: [], end: start };
  return { hops, end: cur };
}
