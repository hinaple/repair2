# Plugin System

This document explains the intent behind REPAIR v2 plugins: keep the existing HTMLElement-based plugin runtime compatible while adding a typed context layer that gives plugins more controlled access to play runtime capabilities.

## Runtime Plugin Types

Runtime plugins are stored by directory type. The current internal directory names are plural:

- `elements`
- `frames`
- `functions`
- `transitions`
- `runtimes`

Public SDK/context names should be singular:

- `element`
- `frame`
- `function`
- `transition`
- `runtime`

The plural names exist because they map directly to project directories. Do not rename those directories in-place. Add mapping layers when exposing cleaner public APIs.

## Svelte Plugin Source Projects

Svelte plugin projects under `plugins/svelte-plugins/{name}` are source workspaces. They are not a separate runtime plugin type.

When built, they become normal runtime plugin files under `plugins/elements` or `plugins/frames`, depending on the selected build target. This preserves the existing runtime model: play loads JavaScript plugin output and uses it through the same plugin manager path as other plugins.

Direct Svelte mounting in play may be useful later, but it should be introduced as an adapter behind the same SDK/context concepts. It should not replace the current plugin output format until compatibility is deliberately redesigned.

## SDK Location

Installed builds copy the SDK package into app data:

```text
%APPDATA%/repair2/sdk/repair2-plugin-sdk
```

Runtime plugin files live under:

```text
%APPDATA%/repair2/project/plugins/{pluginType}
```

Vanilla plugin files should use relative JSDoc imports from their fixed plugin directory to the app-data SDK. Svelte source projects can use a `file:` dependency pointing from `project/plugins/svelte-plugins/{name}` to `../../../../sdk/repair2-plugin-sdk`.

The app should not copy SDK files into every project on load. SDK installation/update belongs to the installer and app-data setup path.

## Import And Use Responsibility

The shared `PluginPointer` model identifies a plugin by name, payloads, and owning type. In play, `pluginManager.js` attaches runtime behavior to `PluginPointer`.

This split is intentional:

- shared classes describe project data
- play renderer decides how plugins are imported, instantiated, hot-reloaded, and given context

Do not assume `PluginPointer` alone explains runtime behavior. For runtime semantics, inspect the play plugin manager.

## Context Injection

Element and frame plugins receive optional `ctx` through constructor options:

```js
new PluginElement({
    modules,
    attributes,
    ctx
});
```

Existing plugins can ignore `ctx`. New plugins should use it instead of reaching into globals where possible.

Function and transition plugins also receive context through their call arguments when the play plugin manager wraps them. This should remain additive so old function plugins continue to work.

The SDK exposes type-specific contexts for each plugin kind. `RepairPluginContext` remains a compatibility union, but new code should prefer the specific type implied by the plugin contract.

## Runtime Plugins

Runtime plugins are project-level plugins activated from optional config. Their purpose is to coordinate behavior across components, resources, variables, and events without replacing the whole play window.

Runtime plugin activation should follow this contract:

```ts
activate(args: {
    attributes: Record<string, unknown>;
    modules?: Record<string, unknown> | null;
    ctx: RepairRuntimePluginContext;
}): void | (() => void) | Promise<void | (() => void)>
```

The returned disposer is called when runtime plugins are deactivated, project data is replaced, or the play window unloads.

Runtime plugin load/activation failures must be reported through plugin reporting and must not stop play.

## HMR Direction

HMR is a development feature for replacing plugin runtime instances when plugin files change.

The important behavior to preserve:

- component frame plugins can be replaced without recreating the whole project
- element plugins can be replaced while preserving the surrounding component runtime
- old plugin contexts must be disposed when a plugin DOM instance is replaced

HMR code is allowed to be pragmatic and renderer-specific. It should not leak into shared classes beyond `PluginPointer` data.

## Dependency Direction

Plugin dependencies are loaded through the play plugin manager and main-process package installation path. The plugin runtime should not install packages directly.

The SDK should type dependency declarations, but the application should continue to own actual package resolution and installation.

## Compatibility Guidance

- Keep `ctx` optional for all existing plugin styles.
- Keep `{ attributes, modules, ...argument }` compatible for function plugins.
- Keep transition keyframe plugins working without a function wrapper.
- Keep directory names compatible.
- Add runtime plugin behavior only through optional config.
- Report plugin failures through editor-visible plugin logs, not uncaught play exceptions.
