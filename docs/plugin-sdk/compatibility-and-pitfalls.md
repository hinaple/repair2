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

## Plugin names are global

REPAIR2 identifies plugins by the manifest `name`, not by the directory name. Names should be unique across all plugin types.

If multiple plugin manifests use the same name, REPAIR2 reports a warning and does not guarantee which one will be used. Treat duplicate plugin names as a project error, even when the duplicate plugins have different types.

## `runtime` with `main` is still `runtime`

The manifest type is still `runtime`; the `main` property adds a main-process entry.

If a runtime plugin does not have `main` in its manifest, renderer `activate()` receives `main: null`.

## Object exports, factory exports, and mount functions

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

Element and frame plugins are mount function exports only. REPAIR2 calls the default export when the plugin should render into a runtime-owned host element.

```js
export default function mount({ attributes, ctx }, options) {
    // ...
}
```

Element mount functions receive `{ target, dispatchEvent }` as their second argument. Frame mount functions receive `{ target, children, showIntro }`.

Renderer runtime, function, and transition factories may be async where the SDK type allows it. Runtime main factories should return the object synchronously.

## Renderer activation is not module construction

Renderer `activate()` is a runtime lifecycle event. It is not a guarantee that REPAIR2 re-imported the module or called the renderer factory again.

The renderer runtime does not promise a specific instance creation moment. Avoid module-level mutable variables for plugin lifetime state. Prefer activation-local state, state stored on the exported object instance, or runtime-owned storage such as `ctx.store`.

Runtime plugins can be deactivated and activated again when runtime plugin config changes, project data resets runtime plugins, or HMR reloads the plugin. Runtime plugin payload comparison is shallow, so update payload objects immutably when you expect a runtime plugin to restart.

REPAIR2 tries to keep already-running plugins available when a rebuild, import, or HMR update fails. A failed update can leave the previous imported plugin instance in use so the play renderer can continue running. Plugin code should still report expected failures through `ctx.logger`, because production-style play can avoid interrupting the user with dialogs for plugin runtime errors.

For project-level loading, linked plugin, and HMR details, see [Loading and HMR](./loading-and-hmr.md).

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

The current runtime also accepts `keyframes` or a transition `function` result as a function returning the keyframe array. Prefer returning the array directly unless delayed keyframe creation is useful.

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

If a plugin needs persistent state or long-lived coordination, prefer a runtime, element, or frame plugin. Function and transition plugins should usually finish their work and release resources quickly.

Element and frame plugins are replaced during HMR. Their previous mount cleanup and context disposal run before the replacement mount. Mount functions may also return a cleanup function. REPAIR2 calls it during plugin unmount.

For element plugins, REPAIR2 clears the host `target` before mounting the plugin. Do not rely on DOM children from a previous mount still being present.

For frame plugins, `children` contains runtime-owned component element nodes. Append it to the correct initial location, but avoid side effects on those child nodes. Do not destroy them, store them for later mutation, or treat them as plugin-owned DOM.

During frame replacement, the previous frame cleanup runs before the new frame mount places the current `children` fragment. Frame cleanup should use direct references to the listeners, resources, and DOM created by that frame plugin, not queries against current child element placement.

Renderer runtime plugins may also return a disposer from `activate()` or provide a `dispose` property. Runtime main entries should use `ctx.lifecycle.onDispose` or return a disposer from `activate()`.

## Component handles are live handles

Component handles are stable frozen objects with getters that read current runtime state. Keep a handle when you want to operate on the same runtime component later.

Getter return values that are objects are snapshots. For example, mutating `handle.position.x.distance` does not move the component. Use handle methods such as `setPosition()` or `setPositionBy()` for runtime changes.

`ctx.components.subscribe()` observes component creation, removal, and replacement. It does not run when a live handle changes visibility, style, z-index, or position.

`handle.node` exposes the live component DOM node. Use it only when the handle methods cannot express the behavior; direct DOM mutation can be overwritten by runtime updates.

Resource handles still describe current runtime state. Read them close to the operation that needs them.

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
