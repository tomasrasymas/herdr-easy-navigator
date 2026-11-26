# Easy Navigator

A [herdr](https://herdr.dev) plugin that lets you walk through tabs and panes with the arrow keys, the way `prefix+w` lets you walk through workspaces.

## Tabs

Press your shortcut and a strip of the current workspace's tabs pops up:

```
  1 api   ▸2 web◂   3 logs   4 notes
 ←/→ select   enter go   esc cancel
```

- **←/→** (or **h/l**) move the selection, wrapping around at the ends.
- **1-9** select a tab by position; **Home/End** select the first or last.
- **Enter** switches to the selected tab and closes the strip.
- **Esc** or **q** close it without switching.

When there are more tabs than fit, the strip scrolls with the selection and shows `‹ ›` markers.

## Panes

Pane mode moves focus around the current tab's panes right away, with no list to pick from. A small `PANES` hint shows while it's on.

- **←↑↓→** (or **h/j/k/l**) move focus to the next pane in that direction.
- At the edge of the tab, focus wraps around to the pane on the far side.
- **Enter**, **Esc** or **q** leave pane mode.
- The [Typing Madness Meter](https://github.com/tomasrasymas/herdr-typing-madness-meter) pane is skipped.

## Install

Needs Node.js 23.6 or newer. There's no build step and no dependencies.

```sh
herdr plugin install tomasrasymas/herdr-easy-navigator
```

Or, from a local checkout:

```sh
herdr plugin link /path/to/herdr-easy-navigator
```

## Keyboard shortcuts

Add these to `~/.config/herdr/config.toml`, then run `herdr server reload-config`. `prefix+p` is herdr's default for "previous tab", so this moves that to `prefix+,`. Put the `[keys]` table above the `[[keys.command]]` entries.

```toml
[keys]
previous_tab = "prefix+comma"

[[keys.command]]
key = "prefix+t"
type = "plugin_action"
command = "easy-navigator.tabs"
description = "navigate tabs"

[[keys.command]]
key = "prefix+p"
type = "plugin_action"
command = "easy-navigator.panes"
description = "navigate panes"
```

You can also open them without a shortcut:

```sh
herdr plugin action invoke easy-navigator.tabs
herdr plugin action invoke easy-navigator.panes
```

## Development

```sh
npm test
```

- `src/navigator.ts` is the tab popup; `src/panes.ts` is the pane-mode popup.
- `src/panes-nav.ts` plans each pane move, including wrap-around, and is unit-tested.
- `src/strip.ts` holds the key decoding, selection and layout logic, and is unit-tested.
- `src/herdr.ts` is a minimal client for herdr's socket.
