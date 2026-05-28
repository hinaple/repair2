# Codex Notes

## Planned editor plugin management

Future editor work should add plugin management UI:

- Show the available plugin list in the editor.
- Allow each plugin to be toggled on or off from the editor.
- Collect and display logs separately for each plugin.

## Deferred plugin work

Revisit these plugin edge cases later:

- Watch linked plugin manifests so changes to linked plugin metadata are detected without manual refresh.
- Surface each plugin's current build state in the editor GUI.
- Make in-progress builds visible from the editor, so users can tell when a linked plugin is still building.
- Send plugin build error details through the same IPC path as build state updates, so the editor can display both status and failure context together.
- Copy `node_modules` for main runtime plugins so their main-process dependencies are available after build/package steps.
- Add validation/reporting for pointer-free `usePlugin()` calls with invalid plugin types or names.
- Full plugin rescans send build changes by plugin name only. If a plugin is renamed while rebuilt, the renderer may need richer previous/new identity data than the current name list.
- Full plugin rescans still run plugin directory updates in parallel; duplicate plugin names are detected, but the selected winner can depend on completion order.
- Plugin CSS records are retained in the play renderer `pluginStyles` map after plugin rename/delete. Style elements are removed, but long development sessions can leave stale records.
