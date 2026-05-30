# Loading and HMR

This page describes the project-level plugin loading behavior. Most plugin authors do not need these details while writing a first plugin, but they are useful when packaging projects, working with linked plugin sources, or debugging HMR.

## Project plugin loading

When REPAIR2 starts or loads a project, it scans the project `plugins/` directory for plugin directories with a valid `manifest.json`. The manifest `name` is the plugin id. Directory names are paths, not plugin identity.

REPAIR2 also reads the project `plugin-links.json` file. This file records external source directories for linked plugins:

```json
{
    "my-plugin": {
        "sourcePath": "D:/path/to/my-plugin"
    }
}
```

`plugin-links.json` is an internal project registry. Do not treat it as a normal author-edited plugin configuration file. Editor link and unlink tools should be preferred when they are available.

Do not manually edit, delete, move, or rewrite `plugin-links.json`. The file is maintained by REPAIR2's plugin link features, and manual edits can leave the project registry out of sync with installed plugin manifests.

After the plugin list is known, REPAIR2 checks whether each plugin has built output. Plugins without built output are built before play starts. If development mode is enabled, REPAIR2 rebuilds linked and project-local plugins even when built output already exists.

Runtime plugins with a `main` entry have their main-process output loaded by the main process. After plugin builds and main-side loading are complete, the play renderer starts and imports ready renderer plugin output.

## Source and built output

A plugin source directory is needed for authoring and rebuilding. It is not required just to run a project when the built output is already present.

A linked plugin can become unlinked when the external source directory was moved, deleted, or is not available on the current machine. This is a normal state for projects that were packaged or moved without development sources. If the project still contains the plugin's built output, REPAIR2 can treat the plugin as ready and run it.

If an unlinked plugin does not have the required built output, REPAIR2 cannot rebuild it until the source link is restored.

## Loading states

Project plugin state is best understood as separate steps:

- The plugin is listed when REPAIR2 finds and accepts its manifest.
- The plugin is built when the expected output files exist.
- The plugin is ready when REPAIR2 can run from the current built output.
- The play renderer imports ready renderer output and tries to keep it available.

These states are not the same as plugin activation. Element and frame plugins activate when their host component or element is mounted. Runtime plugins activate from project runtime plugin configuration. Function and transition plugins run when a step, listener, or transition path calls them.

REPAIR2 favors keeping the play runtime alive. If a rebuild, import, or hot update fails, the renderer may continue using a previous import when one is available.

## HMR mode

Development mode enables plugin HMR. When it is enabled at project load, or later enabled and saved from project settings, REPAIR2 starts watch builds for plugins that have usable source directories.

When development mode is disabled, REPAIR2 stops active plugin watchers.

Plugin source changes are handled by Vite watch builds. After a successful watched rebuild, REPAIR2 notifies the play renderer so the affected plugin can be replaced. Element and frame replacements unmount the previous plugin and dispose its context before mounting the replacement. Runtime replacements dispose the previous renderer runtime instance and the paired main instance when present.

HMR is designed for authoring, not as a stable persistence boundary. Avoid relying on module-level mutable state, exact import timing, or a specific disposal order.

## Manifest and directory changes

While HMR is active, REPAIR2 watches project plugin metadata:

- changes to `plugins/*/manifest.json`
- creation, deletion, or rename of directories directly under `plugins/`
- source `manifest.json` changes for linked plugins that still have an available source directory

Changing a project plugin manifest reloads that plugin's information and rebuilds it. Directory changes cause REPAIR2 to rescan the full plugin list.

Changing manifest identity fields such as `name` or `type`, or changing plugin directory structure while HMR is running, can interrupt the normal replacement path. If plugin identity or directory layout changes during development, a full plugin reload or project reload is the clearest recovery path.

For linked plugins, REPAIR2 uses the source manifest as the development source of metadata. When the linked source manifest changes, REPAIR2 updates the project copy of `manifest.json`, reloads the plugin information, and rebuilds the plugin.

If a manifest is temporarily invalid while development mode is enabled, REPAIR2 can keep watching that manifest and retry the plugin update after the file changes again. The editor diagnostics should be used to find the current manifest or build error.

## Runtime main HMR

For runtime plugins with `main`, the main instance follows the renderer runtime lifecycle. Renderer activation creates the paired main instance. Renderer disposal disposes it.

If the main-side source changes during HMR, REPAIR2 reloads the main output and also replaces the renderer runtime side. If only the renderer-side source changes, the main module may not be re-imported, but the main instance is still recreated because the renderer runtime is reactivated.

See [Runtime main](./runtime-main.md) for the bridge API and activation order.

## Runtime plugin reset

Project reset steps can request runtime plugin reset. This restarts active runtime plugins, but plugin authors should not depend on a strict global disposal order or a single synchronous disposal moment. Register cleanup with `ctx.lifecycle.onDispose` or return an activation disposer.

## Duplicate names

Plugin names are global within the project. If two manifests use the same `name`, REPAIR2 reports a duplicate-name warning and does not guarantee which plugin will be used. This applies even if the plugins have different types.

Use a stable, unique, namespaced plugin name.

## Old project migration

Projects created with REPAIR2 2.4.9 or earlier may contain plugins in the old layout. When REPAIR2 detects an old project without versioned project data and the `plugins/` directory is not empty, it moves the existing plugin directory aside to `plugins_old/` and warns the user. If `plugins_old/` already exists, it may be cleared before the old plugin directory is moved.
