# Codex Notes

## Runtime-with-main SDK documentation note

When documenting runtime plugins with a main entry, describe the activation order and renderer call behavior:

- Main `activate()` runs before renderer `activate()`.
- If main `activate()` calls a renderer method through `renderer.someMethod()`, the call is queued until renderer activation finishes.
- Plugin authors should not assume renderer method calls from main `activate()` run immediately.
- Renderer method calls from main `activate()` can be delayed while the renderer runtime is still loading and initializing.
- Renderer methods that depend on renderer-side initialization should be designed with this delayed execution behavior in mind.

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
- Add validation/reporting for pointer-free `usePlugin()` calls with invalid plugin types or names.
- Full plugin rescans send build changes by plugin name only. If a plugin is renamed while rebuilt, the renderer may need richer previous/new identity data than the current name list.
- Full plugin rescans still run plugin directory updates in parallel; duplicate plugin names are detected, but the selected winner can depend on completion order.
- Plugin CSS records are retained in the play renderer `pluginStyles` map after plugin rename/delete. Style elements are removed, but long development sessions can leave stale records.

## Frame plugin HMR documentation note

When documenting frame plugin HMR, mention the current `repairComponent` replacement order:

- During frame HMR, existing child elements are moved into the new frame before the old frame context is disposed.
- Old frame plugins should not rely on querying current children during dispose cleanup, because those children may already have moved.
- Plugin authors should keep direct references to listeners/resources they need to clean up.
