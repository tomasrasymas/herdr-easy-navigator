// Pure logic for a one-line text field read from raw terminal input.

export interface EditResult {
  value: string;
  /** Set once Enter (submit) or Esc/Ctrl+C (cancel) is pressed; later input in the chunk is dropped. */
  done?: "submit" | "cancel";
}

export const MAX_NAME = 64;

/** Apply one chunk of raw input to `value`. */
export function editText(value: string, chunk: string): EditResult {
  let chars = Array.from(value);
  let i = 0;
  while (i < chunk.length) {
    // Arrow keys, Home/End and bracketed-paste markers carry no text.
    const seq = /^\x1b(?:\[|O)[0-9;]*[~A-Za-z]/.exec(chunk.slice(i));
    if (seq) {
      i += seq[0].length;
      continue;
    }
    const c = String.fromCodePoint(chunk.codePointAt(i)!);
    i += c.length;
    if (c === "\r" || c === "\n") return { value: chars.join(""), done: "submit" };
    if (c === "\x1b" || c === "\x03") return { value: chars.join(""), done: "cancel" };
    if (c === "\x7f" || c === "\b") chars.pop();
    else if (c === "\x15") chars = []; // Ctrl+U
    else if (c === "\x17") {
      // Ctrl+W: drop trailing spaces, then the word before them.
      while (chars.at(-1) === " ") chars.pop();
      while (chars.length && chars.at(-1) !== " ") chars.pop();
    } else if (c >= " " && chars.length < MAX_NAME) chars.push(c);
  }
  return { value: chars.join("") };
}
