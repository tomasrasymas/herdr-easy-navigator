// Pure logic for the agents list: vertical selection moves, the scroll
// window and fitting each row into the popup's width.

import { move } from "./strip.ts";
import type { Key } from "./strip.ts";

/** New selected index after a key in a vertical list. Null for confirm/cancel. */
export function moveList(selected: number, count: number, key: Key): number | null {
  if (key.kind === "up") return move(selected, count, { kind: "left" });
  if (key.kind === "down") return move(selected, count, { kind: "right" });
  if (key.kind === "left" || key.kind === "right") return count === 0 ? null : selected;
  return move(selected, count, key);
}

/** First visible row, so the selection stays in view with some context around it. */
export function scrollStart(selected: number, count: number, rows: number): number {
  if (count <= rows) return 0;
  const start = selected - Math.floor(rows / 2);
  return Math.max(0, Math.min(start, count - rows));
}

/** Cut `text` to `width` columns, ending with … when it doesn't fit. */
export function fit(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text;
  return width === 1 ? "…" : text.slice(0, width - 1) + "…";
}

export interface AgentRow {
  where: string;
  title: string;
  status: string;
}

/**
 * Plain text of one row: number, location padded to a shared column, then
 * the title, all within `width` columns. The status marker is drawn
 * separately so it can be coloured.
 */
export function rowText(row: AgentRow, index: number, whereWidth: number, width: number): string {
  const num = index < 9 ? `${index + 1}` : " ";
  const where = fit(row.where, whereWidth).padEnd(whereWidth);
  return fit(`${num} ${where}  ${row.title}`, width);
}

/** Width of the location column: wide enough for the longest, but at most half the row. */
export function whereColumn(rows: AgentRow[], width: number): number {
  const longest = Math.max(0, ...rows.map((r) => r.where.length));
  return Math.max(4, Math.min(longest, Math.floor(width / 2)));
}
