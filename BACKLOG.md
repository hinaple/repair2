# BACKLOG

## Product And Editor Backlog

- Make all attributes variable-capable, similar to After Effects expressions/controls.
- Support touchpad-friendly editor navigation.
- Add editor guides.
- Improve preview behavior.
- Add comment nodes.
- Add code patching support.
- Add resource search.
- Cache positions for all elements in the node space to minimize `getClientBoundingRect()` calls.
- Improve the default project template.
- Add an online viewer.

## Documentation

- Edit and expand documentation.

## Runtime And Element System

- Refactor `repairElement.js`.
- Add a styling host for element plugins.

## Plugin Authoring And Types

- Add bulk plugin support.
- Add typed plugin attributes.
- Validate/report invalid plugin type or name for pointer-free `usePlugin()` calls.
- Changing plugin selection should reset or reconcile `exportName`; stale exports from the previous plugin can make the new plugin look unavailable.

## Editor Plugin Management

- Add per-plugin enable/disable controls in the editor.
- Collect and display logs per plugin.

## Plugin Build, Packaging, And HMR

- Copy `node_modules` for main runtime plugins so main-process dependencies survive build/package steps.
- Runtime plugin HMR can briefly mismatch renderer and main code when both builds change. Revisit coordination so activation does not pair new renderer code with old main code.
- Full plugin rescans currently send build changes by plugin name only. If a plugin is renamed while rebuilt, the renderer may need previous/new identity data.
- Full plugin rescans currently update plugin directories in parallel. Duplicate names are detected, but the selected winner can depend on completion order.

## Plugin Runtime Diagnostics

- Show an on-screen preview placeholder when plugin mount fails before the mount function runs.

## Plugin CSS Cleanup

- Plugin CSS records stay in the play renderer `pluginStyles` map after plugin rename/delete. Style elements are removed, but long dev sessions can leave stale records.

## Likely Stale, Verify Before Editing

- Available plugin list in editor: appears implemented by `Plugins.svelte` and `PluginPreview.svelte`.
- Linked plugin manifest watching: appears implemented by `watchFineManifest()` and `watchErrorManifest()`.
- Plugin build state in editor GUI: appears partially implemented through `ready`/`error` in renderer plugin info and warning/error UI in `PluginPreview.svelte`.
- Plugin build error details through update IPC: appears implemented through `InfoForRenderer.error` on `plugin:update` and `plugin:hmr`.
- Linked plugin rename before duplicate-name validation: appears fixed because `changePluginInfo()` checks duplicate names before `replaceName()`.
