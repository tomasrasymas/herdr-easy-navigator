# Easy Navigator

A [herdr](https://herdr.dev) plugin that lets you walk through tabs, panes and agents with the arrow keys, the way `prefix+w` lets you walk through workspaces.

## Tabs

Press your shortcut and a strip of the current workspace's tabs pops up:

```
  1 api   ▸2 web◂   3 logs   4 notes   n new   r rename   c close
 ←/→ select   enter go   esc cancel
```

- **←/→** (or **h/l**) move the selection, wrapping around at the ends.
- **1-9** select a tab by position; **Home/End** select the first tab or the last item.
- **Enter** switches to the selected tab and closes the strip.

Each action is labelled with its key: press the key, or move onto the action and press **Enter**.

- **n new** asks for a name, then opens the tab in the current pane's directory and switches to it. **Enter** creates it (an empty name isn't accepted), **Esc** goes back to the strip.
- **r rename** asks for a new name for the highlighted tab, or the tab you're in when an action is highlighted. The field starts with the current name. **Enter** saves, **Esc** goes back.
- In the name field, **Backspace** deletes a character, **Ctrl+U** clears it and **Ctrl+W** deletes the last word.
- **c close** closes the highlighted tab, or the tab you're in when an action is highlighted. It asks first: **Enter/y** closes it, **Esc/n** keeps it.
- **Esc** or **q** close the strip without switching.

When there are more tabs than fit, the strip scrolls with the selection and shows `‹ ›` markers.

## Panes

Pane mode moves focus around the current tab's panes right away, with no list to pick from. A small `PANES` hint shows while it's on.

- **←↑↓→** (or **h/j/k/l**) move focus to the next pane in that direction.
- At the edge of the tab, focus wraps around to the pane on the far side.
- **r** splits the focused pane to the right; **d** splits it downward. The new pane opens in the same directory and takes focus, and pane mode stays on.
- **c** closes the focused pane after asking: **Enter/y** closes it and leaves pane mode, **Esc/n** keeps it.
- **Enter**, **Esc** or **q** leave pane mode.
- The [Typing Madness Meter](https://github.com/tomasrasymas/herdr-typing-madness-meter) pane is skipped.

## Agents

Press your shortcut and a list of every agent, across all workspaces, pops up:

```
 ○ 1 ai-research › ai-research          Claude Code
▸● 2 vibe coding › web                  Fix login redirect
 ▲ 3 vibe coding › api                  Approve migration?
 ↑/↓ select   enter go   esc cancel
```

- **↑/↓** (or **k/j**) move the selection, wrapping around at the ends.
- **1-9** select an agent by position; **Home/End** select the first or last.
- **Enter** jumps to the selected agent's pane, switching workspace and tab as needed.
- **Esc** or **q** close it without moving.

The marker shows each agent's state: `●` working, `▲` blocked, `✓` done, `○` idle. The list opens on the agent you're in and scrolls when there are more agents than fit.

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

[[keys.command]]
key = "prefix+a"
type = "plugin_action"
command = "easy-navigator.agents"
description = "navigate agents"
```

You can also open them without a shortcut:

```sh
herdr plugin action invoke easy-navigator.tabs
herdr plugin action invoke easy-navigator.panes
herdr plugin action invoke easy-navigator.agents
```

## Development

```sh
npm test
```

- `src/navigator.ts` is the tab popup; `src/panes.ts` is the pane-mode popup; `src/agents.ts` is the agents popup.
- `src/panes-nav.ts` plans each pane move, including wrap-around, and is unit-tested.
- `src/strip.ts` holds the key decoding, selection and layout logic, and is unit-tested.
- `src/list.ts` holds the agents list's selection, scrolling and row layout, and is unit-tested.
- `src/herdr.ts` is a minimal client for herdr's socket.
