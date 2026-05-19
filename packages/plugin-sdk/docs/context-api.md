# REPAIR Plugin SDK Context Guide

This guide is for plugin developers using `@fainthit/repair2-plugin-sdk`. It focuses on how to use `ctx` safely, what side effects each API has, and what patterns to avoid.

The SDK provides types and small definition helpers. The actual context object is created by the REPAIR play renderer.

Vanilla JS plugins should usually reference the app-data SDK package with JSDoc. From a file such as `project/plugins/elements/my-plugin.js`, use `import("../../../sdk/repair2-plugin-sdk")`. Svelte plugin source projects may also install and import `@fainthit/repair2-plugin-sdk` because they have a build step.

## Mental Model

`ctx` is a controlled view into the play runtime. It is not a copy of app state and it is not ownership of REPAIR internals.

Use it to:

- observe existing runtime components
- control existing runtime components
- read/write runtime variables by name
- read/create resource elements and manage preloads
- inspect app runtime state
- send socket/serial data
- use the main-owned persistent store
- communicate through project events or plugin-scoped events
- expose plugin-to-plugin services
- register cleanup for long-lived work

Do not use it to:

- mutate raw project data directly
- keep stale handles forever
- create a parallel component system
- assume every API exists in older REPAIR versions
- throw from expected plugin misuse paths

## Context Availability By Plugin Type

Runtime, element, and frame plugins are the safest places to use long-lived context APIs.

Element and frame plugin constructors should still treat `ctx` as optional:

```js
constructor({ attributes = {}, ctx = null } = {}) {
    super();
    this.ctx = ctx;
}
```

Function and transition plugins may receive `ctx`, but they are usually short-lived execution helpers. Avoid registering long-lived subscriptions from function/transition plugins unless you also dispose them immediately. Their lifecycle is not a good place for app-wide listeners.

## Cleanup And Auto-Unsubscribe

These context methods automatically register their unsubscribe/dispose functions with `ctx.lifecycle`:

- `ctx.events.on(...)`
- `ctx.components.subscribe(...)`
- `ctx.variables.subscribe(...)`
- `ctx.services.provide(...)`

That means element/frame/runtime plugins usually do not need to manually unsubscribe when they are removed. Cleanup runs when the plugin context is disposed.

Still keep the returned unsubscribe when you want to stop earlier:

```js
const off = ctx.events.on("modal:close", closeModal, { scope: "plugin" });

button.onclick = () => {
    off();
};
```

For runtime plugins, returning an unsubscribe from `activate` is fine:

```js
/** @type {import("../../../sdk/repair2-plugin-sdk").RepairRuntimePlugin} */
export default {
    id: "example.runtime",
    activate({ ctx }) {
        return ctx.components.subscribe((components) => {
            ctx.logger.info("components", components.length);
        });
    }
};
```

Disposal happens during HMR replacement, component removal, runtime plugin deactivation, project data replacement, and play window unload. Cleanup errors are reported and should not block other cleanup.

## Logging And Error Reporting

Use `ctx.logger` for developer-visible plugin logs:

```js
ctx.logger.info("mounted");
ctx.logger.warn("missing optional resource");
ctx.logger.error("failed to initialize");
```

These logs appear in the editor. Warning/error logs may also open dialogs. Do not use warnings for high-frequency events.

Avoid `throw` for expected runtime conditions like missing components or resources. Prefer reporting and returning safely:

```js
const component = ctx.components.get("WindowA");
if (!component) {
    ctx.logger.warn("WindowA does not exist yet.");
    return;
}
```

## Events And Their Side Effects

`ctx.events.emit/on` defaults to `scope: "repair"`.

This is powerful because repair events can activate project event entries. It is also a side effect. Use the default only when you intentionally want project flow to participate.

```js
ctx.events.emit("door-opened", { id: "A" });
```

Use `scope: "plugin"` for plugin-to-plugin broadcasts that should not run project event entries:

```js
ctx.events.emit("taskbar:toggle", "WindowA", { scope: "plugin" });
ctx.events.on("taskbar:toggle", (event) => {
    ctx.components.setVisible(event.data, true);
}, { scope: "plugin" });
```

Use `scope: "local"` for events that should stay inside the same plugin instance:

```js
ctx.events.on("refresh", refresh, { scope: "local" });
ctx.events.emit("refresh", null, { scope: "local" });
```

Listener exceptions are caught and reported through plugin logs.

## Components

Components are existing runtime objects created by project actions. `ctx.components` lets plugins observe and control them; it does not create components.

```js
const handle = ctx.components.get("WindowA");
```

Component lookup accepts the plugin-facing id. This is alias-first: if a component has an alias, use that alias. Handles also include `realId` for diagnostics.

Handles are snapshots. They are useful for one decision, but they should not be treated as always-current state. For ongoing UI, subscribe:

```js
const off = ctx.components.subscribe((components) => {
    renderTaskbar(components);
});
```

Visibility is not existence. Invisible components are still runtime components, and projects may toggle visibility quickly. Do not remove a component just because it is invisible.

Control methods have side effects on the live play runtime:

```js
ctx.components.setVisible("WindowA", false);
ctx.components.setZIndex("WindowA", 20);
ctx.components.setStyle("WindowA", "left: 40px; top: 20px;");
ctx.components.remove("WindowA");
ctx.components.clear();
```

Use `remove` and `clear` carefully. They call existing runtime removal behavior and may trigger transition/disposal paths.

## Variables

Variables are accessed by project variable name:

```js
const score = ctx.variables.get("score");
ctx.variables.set("score", Number(score ?? 0) + 1);
```

Setting a variable changes runtime state and notifies existing variable subscribers/monitoring. It does not rewrite saved project defaults.

Subscribe when you need ongoing updates:

```js
ctx.variables.subscribe("score", (value) => {
    renderScore(value);
});
```

Missing variables are reported through plugin logs and return safe values.

## Resources And Preloads

Resources are title-based:

```js
const resource = ctx.resources.get("portrait.png");
const img = ctx.resources.createElement("portrait.png");
```

`createElement` creates runtime DOM for supported image/video resources. Unsupported resources return `null`.

Preload methods affect runtime preload state:

```js
ctx.resources.addPreload("intro.mp4");
const ready = ctx.resources.isPreloaded("intro.mp4");
ctx.resources.removePreload("intro.mp4");
```

Preload state is runtime-only. It is not saved into project data. Adding/removing preloads can affect later media creation because preloaded elements may be consumed by the resource runtime.

Resource import and asset copying are editor/main responsibilities, not plugin context responsibilities.

## App

`ctx.app` exposes runtime app information without requiring direct access to internal data structures:

```js
const config = ctx.app.getConfig();
const [scaleX, scaleY] = ctx.app.getSizeRatio();
const screen = ctx.app.getScreenSize();
```

`ctx.app.devMode` reflects the current runtime config.

`getConfig()` returns plain data copied from runtime config. Treat it as a snapshot.

`ctx.app.internal.getAppData()` returns the mutable internal `AppData` object. Use it only as an escape hatch when the stable context API is missing a capability. Code that depends on raw app data is more likely to break when REPAIR internals change.

## Communication

`ctx.communication` wraps existing socket/serial send behavior:

```js
ctx.communication.socketSend("status", { ready: true });
ctx.communication.serialSend("payload");
```

Incoming socket and serial data still enter the project through existing communication entries and repair events. To observe incoming data, listen to repair events such as `socket` or `serial`:

```js
ctx.events.on("socket", (event) => {
    ctx.logger.info("socket data", event.data);
});
```

Sending data goes through main-process IPC. It does not create plugin-scoped events by itself.

## Store

`ctx.store` uses the existing main-owned persistent store path:

```js
ctx.store.set("my-plugin.enabled", true);
const enabled = ctx.store.get("my-plugin.enabled");
```

Store keys are global to the app. Use namespaced keys such as `your-plugin.setting`.

## Services

Use services when one plugin needs to expose callable behavior to another plugin.

Provider:

```js
return ctx.services.provide("example.counter", {
    count: 0,
    increment() {
        this.count += 1;
        return this.count;
    }
});
```

Consumer:

```js
const counter = ctx.services.tryUse("example.counter");
counter?.increment();
```

`use(name)` reports a warning when missing. `tryUse(name)` returns `null` quietly. Prefer `tryUse` for optional integrations.

Service names are global within the play runtime. Use a namespaced name such as `your-plugin.feature`.

## Lifecycle

Use lifecycle for cleanup that is not already handled by a context API:

```js
const interval = setInterval(tick, 1000);
ctx.lifecycle.onDispose(() => clearInterval(interval));
```

If you register DOM listeners manually, clean them up:

```js
window.addEventListener("resize", resize);
ctx.lifecycle.onDispose(() => window.removeEventListener("resize", resize));
```

Do not call `ctx.lifecycle.dispose()` from ordinary plugin code unless you intentionally want to shut down that plugin instance's context.

## Not Implemented As Context APIs

Component creation is not part of `ctx.components`. Components are still created through existing project actions/steps. This keeps context from becoming a second component runtime with different behavior.

## Practical Checklist

Before shipping a plugin:

- Use `// @ts-check`.
- Treat `ctx` as optional in element/frame constructors.
- Use `ctx.logger` for plugin-visible messages.
- Choose event scopes deliberately.
- Avoid long-lived subscriptions in function/transition plugins.
- Clean up manual timers, DOM listeners, and external resources.
- Avoid storing component handles as permanent truth.
- Use `ctx.app.internal.getAppData()` only when there is no stable context API for the task.
