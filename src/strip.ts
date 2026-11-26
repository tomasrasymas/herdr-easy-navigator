// Pure logic for the tab strip: key decoding, selection moves and fitting
// the tabs into the popup's width.

export type Key =
  | { kind: "left" }
  | { kind: "right" }
  | { kind: "up" }
  | { kind: "down" }
  | { kind: "first" }
  | { kind: "last" }
  | { kind: "jump"; index: number }
  | { kind: "confirm" }
  | { kind: "cancel" };

/** Decode one chunk of raw terminal input into keys. */
export function decodeKeys(chunk: string): Key[] {
  const keys: Key[] = [];
  let i = 0;
  while (i < chunk.length) {
    const rest = chunk.slice(i);
    const seq = /^\x1b(?:\[|O)([A-D]|[0-9;]*[~A-Z])/.exec(rest);
    if (seq) {
      const code = seq[1];
      if (code === "D") keys.push({ kind: "left" });
      else if (code === "C") keys.push({ kind: "right" });
      else if (code === "A") keys.push({ kind: "up" });
      else if (code === "B") keys.push({ kind: "down" });
      else if (code === "H" || code === "1~") keys.push({ kind: "first" });
      else if (code === "F" || code === "4~") keys.push({ kind: "last" });
      i += seq[0].length;
      continue;
    }
    const c = chunk[i++];
    if (c === "\r" || c === "\n") keys.push({ kind: "confirm" });
    else if (c === "\x1b" || c === "q" || c === "\x03") keys.push({ kind: "cancel" });
    else if (c === "h") keys.push({ kind: "left" });
    else if (c === "l") keys.push({ kind: "right" });
    else if (c === "k") keys.push({ kind: "up" });
    else if (c === "j") keys.push({ kind: "down" });
    else if (c >= "1" && c <= "9") keys.push({ kind: "jump", index: Number(c) - 1 });
  }
  return keys;
}

/** New selected index after a key, wrapping at both ends. Null for confirm/cancel. */
export function move(selected: number, count: number, key: Key): number | null {
  if (count === 0) return null;
  switch (key.kind) {
    case "left":
      return (selected - 1 + count) % count;
    case "right":
      return (selected + 1) % count;
    case "up":
    case "down":
      return selected;
    case "first":
      return 0;
    case "last":
      return count - 1;
    case "jump":
      return key.index < count ? key.index : selected;
    case "confirm":
    case "cancel":
      return null;
  }
}

export interface Cell {
  text: string;
  selected: boolean;
}

const MAX_LABEL = 24;

function cellText(label: string, index: number, selected: boolean): string {
  const name = label.length > MAX_LABEL ? label.slice(0, MAX_LABEL - 1) + "…" : label;
  return selected ? `▸${index + 1} ${name}◂` : ` ${index + 1} ${name} `;
}

/**
 * Lay out the tab cells in `width` columns, scrolling so the selected tab is
 * visible. `more` flags tabs cut off on either side.
 */
export function layoutStrip(
  labels: string[],
  selected: number,
  width: number,
): { cells: Cell[]; moreLeft: boolean; moreRight: boolean } {
  const all = labels.map((l, i) => ({ text: cellText(l || "tab", i, i === selected), selected: i === selected }));
  const gap = 1;
  const room = Math.max(1, width - 4); // keep space for the ‹ › markers
  let start = selected;
  let end = selected + 1;
  let used = all[selected]?.text.length ?? 0;
  // Grow right first, then left, while the cells still fit.
  for (let grew = true; grew; ) {
    grew = false;
    if (end < all.length && used + gap + all[end].text.length <= room) {
      used += gap + all[end++].text.length;
      grew = true;
    }
    if (start > 0 && used + gap + all[start - 1].text.length <= room) {
      used += gap + all[--start].text.length;
      grew = true;
    }
  }
  return { cells: all.slice(start, end), moreLeft: start > 0, moreRight: end < all.length };
}
