# Compatibility and pitfalls

These are the rules that are easiest to miss when writing plugins.

## The SDK is type-only

Use the SDK for types. REPAIR2 provides the runtime behavior.

Do not design plugins around SDK runtime imports. The runtime object you use at execution time is the injected `ctx`.

## Manifest files are JSON

The app reads `manifest.json` and parses it as JSON. JavaScript or TypeScript manifest files are not part of the current runtime.

Use the JSON schema for editor support:

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-plugin",
    "type": "runtime"
}
```

The schema describes the public manifest shape for editor support. Current runtime loading does not validate the full schema. REPAIR2 still owns manifest loading, normalization, build paths, and runtime plugin registration.

See [Manifest](./manifest.md) for manifest fields and defaults.

## `runtime` with `main` is still `runtime`

The manifest type is still `runtime`; the `main` property adds a main-process entry.

If a runtime plugin does not have `main` in its manifest, renderer `activate()` receives `main: null`.

## Object exports and factory exports

Runtime, function, transition, and runtime main entries can be object exports or factory exports.

```js
export default {
    activate() {}
};
```

```js
export default () => ({
    activate() {}
});
```

Element and frame plugins are constructor exports only. REPAIR2 calls `new Plugin({ attributes, ctx })`.

Write element and frame constructors so the options object can be omitted. This keeps older or test code from breaking unnecessarily.

Renderer runtime, function, and transition factories may be async where the SDK type allows it. Runtime main factories should return the object synchronously.

## Renderer activation is not module construction

Renderer `activate()` is a runtime lifecycle event. It is not a guarantee that REPAIR2 re-imported the module or called the renderer factory again.

The renderer runtime does not promise a specific instance creation moment. Avoid module-level mutable variables for plugin lifetime state. Prefer activation-local state, state stored on the exported object instance, or runtime-owned storage such as `ctx.store`.

Runtime plugins can be deactivated and activated again when runtime plugin config changes, project data resets runtime plugins, or HMR reloads the plugin. Runtime plugin payload comparison is shallow, so update payload objects immutably when you expect a runtime plugin to restart.

## Function plugins are objects

The current function plugin contract is an object with a `function` property.

```js
export default {
    function() {}
};
```

Do not export a bare function as the plugin itself.

## Transition plugins are objects

Transition plugins export an object with `keyframes` or `function`.

```js
export default {
    keyframes: [{ opacity: 0 }, { opacity: 1 }]
};
```

Direct keyframe array exports are not part of the current contract.

## Runtime step names must match the manifest

Runtime step methods are looked up by name. If the manifest declares a step named `open`, the runtime plugin must define an `open` method.

```json
{
    "name": "window-tools",
    "type": "runtime",
    "steps": {
        "open": ["target"]
    }
}
```

```js
export default {
    open({ attributes }) {
        // ...
    }
};
```

If the method does not exist, REPAIR2 reports a plugin issue instead of calling it.

Step declaration values describe editor attribute input names. They are not method arguments, not a payload schema, and not runtime validation.

Runtime step calls run only after renderer activation is ready. Do not use runtime steps as plugin initialization hooks.

## Renderer to main returns a promise

When renderer runtime code calls `main.foo()`, it crosses IPC. It always returns a promise, even if the main method returns a plain value.

```js
export default {
    async activate({ main }) {
        const result = await main?.foo("value");
    }
};
```

`main` can be `null`, so either check it or design the plugin to require a manifest `main` entry.

## Main to renderer is fire-and-forget

When main entry code calls `renderer.bar()`, the current runtime sends the call to the renderer and does not return a renderer result.

Design renderer methods as commands or notifications, not as request/response functions.

If main code needs a result, store it in main-side state or design a separate renderer-to-main request path.

## Renderer calls from main activation can be delayed

Each renderer activation request creates a new main runtime instance and disposes the previous one for that plugin. Main `activate()` runs before renderer `activate()` finishes. If main `activate()` calls a renderer method, REPAIR2 queues the call until the renderer runtime is ready.

In other words, renderer methods should not assume they run immediately during main activation. Keep initialization order simple, and write renderer methods as idempotent commands that tolerate disposal before delivery.

## Use lifecycle cleanup

Runtime, element, and frame plugins commonly keep subscriptions or external resources. Register cleanup with `ctx.lifecycle.onDispose`.

```js
const interval = setInterval(tick, 1000);
ctx.lifecycle.onDispose(() => clearInterval(interval));
```

Function and transition plugins are usually short-lived. Avoid long-lived subscriptions there unless you clean them up explicitly.

Element and frame plugins are replaced during HMR. Their previous context is disposed when the replacement is mounted.

Renderer runtime plugins may also return a disposer from `activate()` or provide a `dispose` property. Runtime main entries should use `ctx.lifecycle.onDispose` or return a disposer from `activate()`.

## Component handles are snapshots

Component and resource handles describe current runtime state. They are useful for decisions and rendering, but they are not permanent project data ownership.

For ongoing UI, subscribe to changes. For one-time operations, read the handle close to the operation.

The same rule applies to resource handles. They describe current runtime state, not a stable ownership model.

## Event scope matters

`ctx.events.emit()` defaults to the `repair` scope. That can trigger project event entries. Use `plugin` or `local` scope for plugin-only communication.

```js
ctx.events.emit("changed", data, { scope: "plugin" });
```

## Internal app data is an escape hatch

`ctx.app.internal.getAppData()` exposes mutable internal app data. Use it only when the stable context APIs cannot express the behavior.

If a plugin depends on internal app data shape, treat that dependency as compatibility-sensitive.

See [Context](./context.md) for stable context APIs.

## Side effects in transitions

Transition plugins should usually return keyframes and stop there. Component mutation, project event emission, long timers, and subscriptions are better handled by runtime, element, frame, or function plugins.

## Prefer plugin logs over uncaught errors

Use `ctx.logger` for expected plugin problems and diagnostics. Throwing can still be useful for programmer errors, but user-visible plugin failures should be reported through the plugin log path where possible.
