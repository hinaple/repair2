# Compatibility And Pitfalls

This document lists common mistakes that can break projects, make plugins difficult to debug, or create surprising runtime side effects.

## `ctx` May Be Missing In Older Paths

Element and frame plugins should handle `ctx = null`.

Do not assume every project/runtime has the newest context implementation.

## Repair Event Scope Can Run Project Entries

`ctx.events.emit("channel", data)` defaults to repair scope. This can activate project event entries.

Use `scope: "plugin"` when the event is only for plugin-to-plugin communication. Use `scope: "local"` when the event should stay inside the same plugin instance.

## Function And Transition Plugins Are Not Good Hosts For Subscriptions

Function and transition plugins are usually short-lived. Long-lived subscriptions from them can accumulate if not cleaned up immediately.

Use runtime, element, or frame plugins for long-lived listeners.

## Component Handles Are Snapshots

A component handle reflects current runtime state at the time it was read. It is not a permanent live object.

For UI that must stay current, use `ctx.components.subscribe`.

## Invisible Does Not Mean Deleted

Invisible components still exist in runtime state. They may be mounted back into DOM later.

Do not remove invisible components unless deletion is actually intended.

## `remove` And `clear` Are Destructive Runtime Operations

`ctx.components.remove` and `ctx.components.clear` call existing runtime removal behavior. They can trigger transitions, DOM removal, and plugin context disposal.

Use `setVisible(false)` when you only want to hide something.

## Preloads Can Be Consumed

Resource preloads are runtime state. Creating a resource element may consume a preloaded element depending on runtime behavior.

Do not treat preload state as a permanent cache or saved project data.

## Variable Writes Are Runtime Writes

`ctx.variables.set` changes runtime state and notifies runtime subscribers. It does not change the saved default value in project data.

## Plugin Logs Can Open Dialogs

Warnings and errors may open editor dialogs. Do not emit warnings/errors in high-frequency loops.

Use `debug` or `info` for noisy development status.

## Treat Raw App Data As Internal

`ctx.app.internal.getAppData()` exposes the mutable internal `AppData` object. It is available as an escape hatch, but it is not a stable public contract.

Prefer focused APIs such as `ctx.app.getConfig`, `ctx.variables`, `ctx.resources`, and `ctx.components` before reaching into raw app data.

## Component Creation Is Not A Context API

Component creation still belongs to existing project actions/steps. `ctx.components` observes and controls components that already exist.

Do not build plugin behavior that assumes `ctx.components` can create project components unless that API is explicitly added later.

## Do Not Reach Into Internals First

Prefer context APIs over globals or internal modules. If a context API does not exist yet, treat that as a design gap instead of relying on private internals.

## Do Not Store Raw DOM References Without Cleanup

If your plugin attaches listeners to `window`, `document`, component elements, or resource elements, clean them up with `ctx.lifecycle.onDispose`.

## Safe Defaults

When unsure:

- make `ctx` optional
- use `tryUse` for optional services
- use `scope: "plugin"` for plugin-only events
- use `setVisible(false)` instead of `remove`
- use `ctx.logger.info` before `warn`
- register cleanup for every manual listener/timer
- namespace `ctx.store` keys
