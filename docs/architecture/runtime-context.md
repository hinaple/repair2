# Runtime Context

Runtime context is the main extension surface for plugins. Its purpose is to give plugins useful control over the existing play runtime without exposing mutable internal arrays or requiring project-specific forks.

## Design Intent

The context should be:

- additive: existing plugins continue to work without it
- typed: SDK users get discoverable APIs
- bounded: plugins receive handles and service APIs, not raw ownership of runtime internals
- observable: plugin misuse is reported through editor-visible logs
- disposable: listeners, services, and runtime plugin work clean up through lifecycle disposers

Context is created by the play renderer. The SDK describes the shape but does not implement it.

## Current Context Areas

The context is currently organized by runtime responsibility:

- `plugin`: identity for the current plugin instance
- `component`, `element`, `frame`: optional runtime identities
- `logger`: editor-visible plugin logs
- `events`: repair/project events plus scoped plugin events
- `components`: read and control APIs for existing runtime components
- `variables`: name-based runtime variable access
- `resources`: title-based resource and preload access
- `app`: runtime app configuration, screen size, size ratio, and explicit internal app-data escape hatch
- `communication`: socket/serial send adapters over existing IPC paths
- `store`: persistent app store access through main-owned IPC
- `services`: plugin-to-plugin service registry
- `lifecycle`: disposer registration

This grouping should remain stable even as individual methods grow.

## Identity Model

Plugin identity includes:

- plugin id/name
- singular public plugin type
- per-instance id

Component and element identities expose both:

- a plugin-facing id, normally alias-first
- the real project uuid

This is deliberate. Project authors usually know aliases, while the runtime still needs uuid-level identity for compatibility and replacement behavior.

## Events

`ctx.events.emit/on` defaults to the existing repair project event path. This allows plugins to activate entry nodes and listen to events emitted by event steps.

Use event scope options when project flow is not intended:

- `scope: "repair"`: uses existing repair project events
- `scope: "plugin"`: plugin bus shared by plugins
- `scope: "local"`: plugin bus namespaced to the same plugin instance

The intent is one event API with explicit scope, not two unrelated event systems developers have to remember.

## Components

`ctx.components` is for observing and controlling components that already exist in the play runtime.

It should not become a parallel component creation system. Component creation should continue through existing project actions unless a later design explicitly adds a creation API.

The context API should:

- expose stable handles rather than the internal component array
- support alias-first access while still carrying the real uuid
- report missing component operations through plugin logs
- preserve existing invisible-component behavior
- avoid changing step action semantics

## Variables

`ctx.variables` uses variable names because plugin developers cannot reasonably hard-code runtime uuids.

The lower-level variable runtime still stores state by id. Name-based helpers are an adapter for plugin and utility ergonomics, not a replacement for the project data model.

Missing variables should be reported and return safe values instead of crashing play.

## Resources

`ctx.resources` uses resource titles for the same reason variables use names: plugin authors need stable human-readable references.

The resource API should focus on existing runtime capabilities:

- list resources
- get resource handles
- create image/video DOM elements
- resolve asset paths
- add/remove/query preload state

It should not own resource import or project asset copying. Those remain editor/main responsibilities.

## App

`ctx.app` provides read-oriented runtime information:

- current dev mode
- plain config snapshot
- size ratio
- screen size

It also exposes `ctx.app.internal.getAppData()` as an explicit escape hatch for code that needs raw internal app data. This is intentionally named `internal` because raw app data is mutable and not a stable SDK contract.

## Communication And Store

`ctx.communication.socketSend` and `ctx.communication.serialSend` wrap existing socket/serial send helpers. Incoming communication remains project flow: main sends incoming data to play, play activates communication entries and emits repair events.

`ctx.store` wraps the main-owned persistent store IPC. Store keys are app-global, so plugin code should use namespaced keys.

## Services

Services are for direct plugin-to-plugin cooperation when events are not enough. They are intentionally simple:

- provider registers a named service object
- consumers use or try-use by name
- lifecycle cleanup removes services provided by the disposed plugin instance

Use services for callable APIs. Use scoped events for broadcasts.

## Lifecycle

Every context has lifecycle disposal. Any API that registers listeners or long-lived resources should register cleanup through `ctx.lifecycle.onDispose()`.

Lifecycle is especially important for:

- HMR replacement
- component removal
- runtime plugin deactivation
- play window unload
- project data replacement

Plugin cleanup failures should be reported but should not prevent remaining cleanup.

## Reporting

Expected plugin misuse should go through `pluginReporter`, not `throw`.

Examples:

- missing component
- missing resource
- invalid event scope
- non-function event listener
- duplicate service name

Fatal SDK helper misuse can throw inside the SDK package, but play-runtime context APIs should prefer reporting and safe return values.

## Runtime Plugin Direction

Runtime plugins are the reason context exists as a broader API. They should be able to build coordination features such as taskbars, window managers, dashboards, or runtime inspectors by controlling existing components and listening to existing events.

They should not need to fork the play renderer or replace the component runtime.

Compatibility rules:

- runtime plugin config is optional
- activation failure is reported, not thrown
- disposer is called on deactivation and unload
- startup entry execution order should remain stable
- runtime plugins should prefer stable context APIs over raw internal data
