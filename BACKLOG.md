# BACKLOG

## Product And Editor Backlog

- Make all attributes variable-capable, similar to After Effects expressions/controls.
- Support touchpad-friendly editor navigation.
- Add per-machine preferences.
- Add editor guides.
- Improve preview behavior.
- Add comment nodes.
- Select all connected nodes on double-click.
- Constrain node movement to one axis while Shift is held.
- Add an option to stay inactive while a sequence is unfinished or when a specific component exists.
- Add code patching support.
- Add resource search.
- Add project validation in the editor to detect and report issues before they cause runtime or build problems.
- Find and clean up unused resources and plugins in a project.
- Add an option to delete the previous resource file when replacing or editing a resource.
- Switch project file export packaging from `archiver` to `yazl`.
- Cache positions for all elements in the node space to minimize `getClientBoundingRect()` calls.
- Improve the default project template.
- Add an online viewer.
- `logContent()` returns `{ _circularRef: true }` even when it's duplicated reference.

## Documentation

- Edit and expand documentation.

## Runtime And Element System

- Refactor `repairElement.js`.
- Add a styling host for element plugins.

## Plugin Authoring And Types

- Add bulk plugin support.
- Add typed plugin attributes.
- Add plugin attribute type configuration.
- Add global shortcut listener registration support to plugin context.
- Add default settings for transition plugins.
- Validate/report invalid plugin type or name for pointer-free `usePlugin()` calls.
- Changing plugin selection should reset or reconcile `exportName`; stale exports from the previous plugin can make the new plugin look unavailable.

## Editor Plugin Management

- Add per-plugin enable/disable controls in the editor.
- Collect and display logs per plugin.
- Improve editor log styling, show remaining time before logs disappear, and keep logs visible while hovered.

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
