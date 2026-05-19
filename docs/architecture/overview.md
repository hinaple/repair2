# REPAIR v2 Architecture Notes

This documentation is a development guide for keeping REPAIR v2 extensible without breaking existing projects. It should explain architectural intent, ownership boundaries, and compatibility rules. Small algorithms and obvious implementation details should stay in code.

Korean translations live under `docs/architecture/ko/`. The English documents are the source of truth for implementation work.

## Document Map

- `ipc-map.md`: process ownership and IPC channel intent.
- `project-data-schema.md`: project data compatibility rules and optional field policy.
- `execution-model.md`: how play execution is driven by entries, nodes, steps, and actions.
- `component-runtime.md`: how component data becomes play DOM and how plugins should observe/control it.
- `plugin-system.md`: plugin directories, import/use semantics, HMR, and public SDK direction.
- `runtime-context.md`: plugin context design, reporting, lifecycle, and runtime plugin direction.
- `resource-communication-runtime.md`: resources, preloads, audio, communication, shortcuts, and store ownership.

## Core Shape

REPAIR v2 is an Electron app with one main process and two renderer processes:

- Main process: owns project files, native dialogs, plugin package installation, window lifecycle, socket/serial bridges, and cross-renderer forwarding.
- Play renderer: owns project execution, runtime component DOM, runtime variables, media/preload state, plugin use, and runtime monitoring.
- Editor renderer: owns project editing, visual graph UI, resource management UI, and editor-side notifications.
- Shared renderer classes: `src/renderer/classes` holds project model classes used by both editor and play.

The play and editor renderers have separate Vite roots but share `@classes`. Anything added to shared classes must be safe for both renderers, or isolated through the existing `//#only play` / `//#only editor` block convention.

## Design Direction

The main architectural goal is to make plugins more powerful without forcing users to fork the whole application or rewrite whole feature groups as monolithic plugins.

The intended direction is:

- Keep existing project data and runtime behavior compatible.
- Add optional runtime context APIs around existing play capabilities.
- Prefer narrow adapters over rewiring core step execution.
- Let plugins observe and control existing runtime objects instead of inventing parallel systems.
- Route plugin mistakes through editor-visible reporting instead of crashing play.

This means new plugin APIs should usually wrap existing runtime ownership:

- components through the play component manager/registry
- variables through runtime variable state
- resources through the resource/preload manager
- project events through the existing repair event system when project flow is intended
- plugin-only communication through scoped plugin events/services

## Compatibility Policy

Existing `.repair` projects are the highest-priority compatibility target.

Rules:

- New project data fields must be optional.
- Old data must continue to load through constructor defaults.
- Existing step payload meanings must not change.
- Existing `RepairUtils` and step action behavior should not change unless explicitly accepted.
- Existing plugin constructors must keep working without `ctx`.
- Existing plugin directory names must keep working.
- Runtime plugin config must be optional; projects without it should behave as before.

When a behavior change is intentional, report it clearly after implementation.

## Public API Direction

Internal plugin directories are plural (`elements`, `frames`, `functions`, `transitions`, `runtimes`). Public SDK/context language should prefer singular names (`element`, `frame`, `function`, `transition`, `runtime`) and map them internally.

The SDK package is `@fainthit/repair2-plugin-sdk`. It should provide stable typing and helper wrappers, not import application internals. Installed builds copy the SDK to app data under `sdk/repair2-plugin-sdk`, and the play renderer creates the actual context object.

## Error And Log Direction

Plugin-facing errors should be visible to the developer but should not stop play execution for expected misuse.

Use the plugin reporting path:

1. Play sends `plugin-log`.
2. Main forwards it to the editor.
3. Editor shows a toast.
4. Warning/error logs may also open a dialog.
5. Error logs may be written to the existing log-file path.

Use thrown errors only for SDK helper misuse where the failure is local to plugin development and does not crash the play renderer.

## Shared Classes Rule

Shared classes are project model classes, not renderer service containers.

Avoid adding:

- DOM manipulation
- editor UI side effects
- play runtime side effects
- IPC ownership

If renderer-specific behavior is unavoidable, isolate it with the existing only-block convention. Prefer play/editor adapters for new behavior.

## Future Cleanup Direction

Cleanup should be incremental and compatibility-preserving.

Good cleanup targets:

- centralize name/title/id lookup helpers
- keep `PluginPointer` closer to data and move runtime behavior into play adapters
- keep plugin context APIs aligned with SDK types
- reduce duplicated component/resource/variable control logic across context, `RepairUtils`, and step actions
- keep Svelte-native mounting as a possible adapter later, not a replacement for the current HTMLElement plugin runtime
