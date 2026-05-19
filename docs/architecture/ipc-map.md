# IPC Map

IPC exists to preserve ownership boundaries between main, play, and editor. This document focuses on channel intent rather than listing every call-site detail.

## Ownership Rules

Main process owns:

- project directory and `.repair` import/export
- native dialogs
- plugin package installation
- socket and serial native bridges
- window lifecycle
- cross-renderer forwarding
- persistent app store

Play renderer owns:

- project execution
- runtime components
- runtime variables
- preloads/audio runtime state
- plugin use and runtime context

Editor renderer owns:

- editing UI
- project save requests
- resource selection UI
- runtime monitor display
- toast/notification UI

IPC should reinforce these boundaries. Do not bypass main for filesystem, native dialogs, package installation, or native device ownership.

## Main-Owned Request Channels

These channels are handled by main and called from renderers.

| Channel | Intent |
| --- | --- |
| `request-data` | Return current project data plus global styles. |
| `update-data` | Save editor data, update play data, and propagate devtool data. |
| `getDataDir` | Return the current project data directory. |
| `selectFile` | Show a native file picker. |
| `dialogue` | Show a native message dialog. |
| `copyInfoAsset` | Copy external files into the project asset directory. |
| `getPluginList` | Return or refresh plugin directory listings. |
| `plugin:install-package` | Install/load plugin dependency packages through main ownership. |
| `editor-on` | Open or focus editor. |
| `request-execute` | Ask play to execute a node or entry. |
| `layout-preview` / `preview-content-visible` / `stop-preview` | Forward editor preview requests to play. |
| socket/serial command channels | Ask main-owned connectors to connect, send, or close. |
| `monitor-event` | Forward runtime monitor start/end events. |
| `monitor-info` | Forward play runtime monitor state to editor. |
| `custom-log` | Forward project custom log messages to editor toast UI. |
| `plugin-log` | Forward plugin logs to editor toast/dialog and optional file logging. |
| `get-store` / `set-store` | Access main-owned persistent store. |

## Main-To-Play Channels

Main sends these to play when external state changes or editor requests runtime behavior.

| Channel | Intent |
| --- | --- |
| `data` | Replace play app data after editor save. |
| `global-css` | Update play global CSS during development. |
| `plugin-hmr` | Notify play that a plugin changed and should be reloaded. |
| `socket-income` / `serial-income` | Feed communication data into play execution and repair events. |
| `global-key-event` | Drive shortcut entries from main key handling. |
| `monitor-event` | Start or stop runtime monitoring. |
| `request-execute` | Execute a node or enter an entry from editor request. |
| preview channels | Render or clear editor layout preview in play. |

## Main-To-Editor Channels

Main sends these to editor for UI updates and notifications.

| Channel | Intent |
| --- | --- |
| `request-save` | Ask editor to save. |
| undo/redo/zoom channels | Drive editor menu commands. |
| export channels | Show import/export progress. |
| `socket-income` / `socket-failed` / `serial-income` / `serial-connected` | Show communication notifications. |
| `monitor-info` | Update runtime monitor UI. |
| `custom-log` | Show project custom logs. |
| `plugin-log` | Show plugin logs with plugin identity and details. |

## Plugin Reporting Path

Plugin context and plugin manager code should use `plugin-log` for user-visible plugin issues.

The intended flow is:

1. Play reports plugin issue/exception.
2. Main forwards it to editor.
3. Editor shows toast content.
4. Main opens a dialog for warning/error when requested.
5. Main writes error detail to the existing log-file path when appropriate.

This keeps plugin development feedback visible without stopping play.

## Guidance

- Reuse existing channels when ownership and payload semantics match.
- Add channels only when ownership is genuinely different.
- Keep native and filesystem operations in main.
- Keep plugin logs separate from project `custom-log`.
- Update this document when adding new IPC ownership.
