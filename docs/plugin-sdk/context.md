# Context

`ctx` is the object REPAIR2 passes to plugin code when it runs. It is how plugins access runtime features without reaching into global internals.

You do not create `ctx` yourself. The exact context type depends on where the plugin is running:

- `RuntimeContext`
- `ElementContext`
- `FrameContext`
- `FunctionContext`
- `TransitionContext`
- `PluginContext`, the union of all context types

Use the specific type when you know the plugin kind. Use `PluginContext` for shared helper functions.

## Identity

Every context has `ctx.plugin`:

```ts
ctx.plugin.id;
ctx.plugin.type;
ctx.plugin.instanceId;
```

Element and frame contexts also include placement information:

```ts
ctx.component;
ctx.element;
ctx.frame;
```

Runtime contexts have `component`, `element`, and `frame` set to `null`.

## Logger

Use `ctx.logger` for plugin diagnostics:

```js
ctx.logger.info("ready");
ctx.logger.warn("missing resource");
ctx.logger.error("failed to start");
```

These messages go through the plugin log path. This is usually better than writing important plugin feedback only to `console`.

Missing components, resources, variables, services, and invalid event usage are also reported through the app diagnostic path as plugin issues.

## Lifecycle

Use `ctx.lifecycle.onDispose` to clean up subscriptions, timers, observers, and external resources:

```js
const interval = setInterval(tick, 1000);
ctx.lifecycle.onDispose(() => clearInterval(interval));
```

Runtime, element, and frame plugins commonly keep long-lived work. Function and transition plugins are usually short-lived, so keep long-lived work out of them unless you clean it up explicitly.

Most plugins should register cleanup instead of calling `ctx.lifecycle.dispose()` directly. Calling it manually ends the current plugin context and runs registered disposers.

Context subscription and provider APIs return disposers and are also tied to lifecycle cleanup. Keep the returned disposer when you need to unsubscribe earlier than the plugin context disposal.

## Events

`ctx.events.emit` defaults to the `repair` scope:

```js
ctx.events.emit("door-opened", { id: "A" });
```

The `repair` scope can trigger project event entries. For plugin-only communication, use `plugin` or `local`:

| Scope    | Meaning                                                      |
| -------- | ------------------------------------------------------------ |
| `repair` | Project event scope. This can trigger project event entries. |
| `plugin` | Shared plugin event bus channel.                             |
| `local`  | Instance-local plugin event channel.                         |

```js
ctx.events.emit("changed", data, { scope: "plugin" });

ctx.events.on(
    "changed",
    (event) => {
        ctx.logger.info(event.data);
    },
    { scope: "plugin" }
);
```

Use `local` when the event should be scoped to the current plugin instance. Use `plugin` when multiple plugin instances should communicate through the same channel.

## Services

Services are named values shared inside the play runtime:

```js
ctx.services.provide("my-plugin.counter", {
    increment() {}
});
```

Other plugins can use the service by name:

```js
const counter = ctx.services.tryUse("my-plugin.counter");
counter?.increment();
```

Use namespaced names. Service names are global within the play runtime.

Use `use` when a missing service is an expected plugin issue. Use `tryUse` for optional integrations that may not be installed or active.

## Components

`ctx.components` gives you handles for live runtime components:

```js
const components = ctx.components.list();
const panel = ctx.components.get("panel");
```

Handles are snapshots of current runtime state. If you need ongoing updates, subscribe:

```js
const stop = ctx.components.subscribe((components) => {
    ctx.logger.info("component count", components.length);
});
```

Component APIs affect live runtime state, not project source data.

Prefer explicit component APIs such as `setVisible`, `setZIndex`, `setStyle`, `remove`, and `clear`. `modify` is an advanced mutation API and is more compatibility-sensitive.

`setStyle` expects a CSS declaration string, such as `left: 10px; top: 20px;`. It replaces the runtime override style for the component.

A component handle's `element` is the live DOM element. Prefer context component APIs for stateful changes. Direct DOM mutation is advanced and may be overwritten by runtime updates.

## Variables

Variables are addressed by project variable name:

```js
const value = ctx.variables.get("score");
ctx.variables.set("score", Number(value ?? 0) + 1);
```

You can subscribe to variable changes:

```js
ctx.variables.subscribe("score", (value) => {
    ctx.logger.info("score", value);
});
```

Subscriptions registered through context APIs are tied into lifecycle cleanup. Keep the returned disposer when you need to unsubscribe earlier.

## Resources

`ctx.resources` looks up project resources by runtime resource title:

```js
const image = ctx.resources.get("logo");
const element = ctx.resources.createElement("logo");
```

Resource handles describe current runtime state. Read them close to the operation that needs them.

Use `path` or `getPath()` when you need a resolved runtime asset path. `src` is the stored project resource source value.

Preload stores a prepared media element for later use. `createElement()` may consume an existing preload for that resource.

## App, communication, and store

`ctx.app` gives read-oriented app information:

```js
ctx.app.devMode;
ctx.app.getConfig();
ctx.app.getScreenSize();
ctx.app.getSizeRatio();
```

`ctx.communication` sends data through the existing socket and serial paths:

```js
ctx.communication.socketSend("channel", "payload");
ctx.communication.serialSend("payload");
```

Communication send APIs are fire-and-forget. They do not report delivery success to the plugin.

`ctx.store` reads and writes persistent app store values:

```js
ctx.store.set("my-plugin.enabled", true);
const enabled = await ctx.store.get("my-plugin.enabled");
```

Use namespaced store keys to avoid collisions.

`ctx.store` is backed by the app-level Electron Store. It is not project-local. `store.get<T>()` returns `Promise<T>`. Generic type parameters are authoring-time hints only; validate untrusted or versioned values yourself.

## Internal app data

`ctx.app.getConfig()` returns cloned, read-oriented config data. `ctx.app.internal.getAppData()` returns the live mutable internal app data object. Use it only when the stable context APIs cannot express the behavior.

If a plugin depends on internal app data shape, treat that dependency as compatibility-sensitive.

## RepairUtils

`RepairUtils` is the older global utility surface for runtime access. It is legacy. New plugins should use the injected `ctx` APIs instead.
