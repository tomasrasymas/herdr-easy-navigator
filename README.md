# Tab Navigator

A [herdr](https://herdr.dev) plugin that lets you walk through tabs with the arrow keys, the way `prefix+w` lets you walk through workspaces.

Press your shortcut and a strip of the current workspace's tabs pops up:

```
  1 api   ▸2 web◂   3 logs   4 notes
 ←/→ switch   1-9 jump   enter/esc done
```

- **←/→** (or **h/l**) switch the active tab right away, wrapping around at the ends.
- **1-9** jump straight to a tab.
- **Home/End** go to the first or last tab.
- **Enter**, **Esc** or **q** close the strip and leave you on the selected tab.

When there are more tabs than fit, the strip scrolls with the selection and shows `‹ ›` markers.

## Install

Needs Node.js 23.6 or newer. There's no build step and no dependencies.

```sh
herdr plugin install tomasrasymas/herdr-tab-navigator
```

Or, from a local checkout:

```sh
herdr plugin link /path/to/herdr-tab-navigator
```

## Keyboard shortcut

Add this to `~/.config/herdr/config.toml`, then run `herdr server reload-config`:

```toml
[[keys.command]]
key = "prefix+t"
type = "plugin_action"
command = "tab-navigator.open"
description = "navigate tabs"
```

You can also open it without a shortcut:

```sh
herdr plugin action invoke tab-navigator.open
```

## Development

```sh
npm test
```

- `src/navigator.ts` is the popup.
- `src/strip.ts` holds the key decoding, selection and layout logic, and is unit-tested.
- `src/herdr.ts` is a minimal client for herdr's socket.
