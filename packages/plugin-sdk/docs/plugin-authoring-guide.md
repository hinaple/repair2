# Plugin Authoring Guide

This guide explains the full plugin authoring flow for REPAIR v2. Use it as the starting point before reading the API reference.

## 1. Choose The Plugin Type

Choose the smallest plugin type that matches the job.

- Use an element plugin when you need DOM inside one component element.
- Use a frame plugin when you need to wrap a whole component and control its internal layout surface.
- Use a runtime plugin when you need to coordinate multiple components, variables, resources, events, communication, store state, or plugin services across the play runtime.
- Use a function plugin for short-lived logic triggered by steps or listeners.
- Use a transition plugin for animation keyframes or transition-generation logic.

Do not choose a runtime plugin just because it is more powerful. Runtime plugins are best for cross-cutting behavior such as taskbars, inspectors, global controllers, window managers, or plugin-to-plugin coordination.

## 2. Understand Source vs Runtime Plugins

Svelte plugin projects under `project/plugins/svelte-plugins/{name}` are source workspaces. After build, they become normal runtime plugin files under `project/plugins/elements` or `project/plugins/frames`.

The runtime does not treat Svelte source projects as a separate plugin type. Built output should still follow the element/frame plugin contract.

## 3. Use The SDK Types

Installed REPAIR places the SDK under app data:

```text
%APPDATA%/repair2/sdk/repair2-plugin-sdk
```

Runtime plugin files are under:

```text
%APPDATA%/repair2/project/plugins/{pluginType}
```

Vanilla JS plugins are single runtime files. They should not import SDK runtime helpers because that creates an unnecessary runtime dependency. Use JSDoc type imports instead.

For a vanilla element plugin under `project/plugins/elements/my-plugin.js`:

```js
// @ts-check
/** @typedef {import("../../../sdk/repair2-plugin-sdk").RepairElementPluginOptions} RepairElementPluginOptions */

export default class MyPlugin extends HTMLElement {
    /**
     * @param {RepairElementPluginOptions} options
     */
    constructor({ attributes = {}, ctx = null } = {}) {
        super();
        this.ctx = ctx;
        this.textContent = ctx ? `${ctx.plugin.id} mounted` : "mounted";
    }
}
```

For runtime/function/transition plugin files, use the matching exported type with `@type`.

Svelte plugin source projects are different because they have a build step and can run `npm install`. New Svelte plugin projects include:

```json
{
    "devDependencies": {
        "@fainthit/repair2-plugin-sdk": "file:../../../../sdk/repair2-plugin-sdk"
    }
}
```

Inside Svelte plugin source code, both JSDoc type imports and normal SDK helper imports are available.

## 4. Define The Plugin

Vanilla JS plugins should use `@type` instead of importing helpers.

```js
// @ts-check
/** @typedef {import("../../../sdk/repair2-plugin-sdk").RepairRuntimePlugin} RepairRuntimePlugin */

/** @type {RepairRuntimePlugin} */
export default {
    activate({ ctx }) {
        return ctx.components.subscribe((components) => {
            ctx.logger.info("components", components.length);
        });
    }
};
```

Svelte plugin source projects may use SDK helpers if the package is installed:

```js
import { defineElementPlugin } from "@fainthit/repair2-plugin-sdk";

export default defineElementPlugin(MyElement);
```

The helper preserves type information and performs lightweight development-time validation. It does not register the plugin globally. REPAIR still discovers built plugins from project plugin directories.

## 5. Receive Context Carefully

Element and frame plugin constructors should treat `ctx` as optional:

```js
constructor({ attributes = {}, modules = null, ctx = null } = {}) {
    super();
    this.ctx = ctx;
}
```

This keeps plugins compatible with older runtime paths that may not pass context.

Runtime plugins receive a call argument object in `activate({ attributes, modules, ctx })`. Function and transition plugins may also receive context in their call arguments:

```js
/** @type {import("../../../sdk/repair2-plugin-sdk").RepairFunctionPlugin} */
export default {
    function({ attributes, ctx, signal }) {
        if (signal?.aborted) return false;
        ctx?.logger.info("function plugin executed", attributes);
        return true;
    }
};
```

Function and transition plugins are short-lived. Avoid long-lived subscriptions there unless you dispose them before returning.

## 6. Use Logger Instead Of Console For Plugin Feedback

Use:

```js
ctx.logger.info("message");
ctx.logger.warn("message");
ctx.logger.error("message");
```

These messages appear in the editor through the plugin log path. Warning and error logs may also open dialogs, so avoid using them for frequent status updates.

Use `console.*` only for temporary local debugging.

## 7. Be Explicit About Events

`ctx.events.emit/on` defaults to the repair project event scope. This can activate project event entries.

Use the default when you intentionally want project flow:

```js
ctx.events.emit("door-opened", { id: "A" });
```

Use `scope: "plugin"` or `scope: "local"` when the event is only for plugin coordination.

Choosing scope is a design decision, not a cosmetic option.

## 8. Use App, Communication, And Store APIs Deliberately

`ctx.app` exposes read-oriented runtime information:

```js
ctx.app.devMode;
ctx.app.getConfig();
ctx.app.getSizeRatio();
ctx.app.getScreenSize();
```

`ctx.app.internal.getAppData()` returns the mutable internal app data object. Treat it as an escape hatch, not a stable public contract.

`ctx.communication` wraps the same send behavior as `RepairUtils.communication`:

```js
ctx.communication.socketSend("channel", "payload");
ctx.communication.serialSend("payload");
```

`ctx.store` uses the existing main-owned persistent store IPC:

```js
ctx.store.set("my-plugin.enabled", true);
const enabled = ctx.store.get("my-plugin.enabled");
```

Use namespaced store keys to avoid collisions.

## 9. Manage Long-Lived Work

Some context APIs auto-register cleanup:

- `ctx.events.on`
- `ctx.components.subscribe`
- `ctx.variables.subscribe`
- `ctx.services.provide`

Manual timers, DOM listeners, observers, and external resources still need explicit cleanup:

```js
const interval = setInterval(tick, 1000);
ctx.lifecycle.onDispose(() => clearInterval(interval));
```

Do not call `ctx.lifecycle.dispose()` unless you intentionally want to shut down that plugin instance's context.

## 10. Treat Handles As Runtime Snapshots

Component and resource handles describe current runtime state. They are useful for decisions and rendering, but they should not be treated as permanent truth.

For ongoing UI, subscribe to component or variable changes. For one-time operations, re-read the handle shortly before acting.

## 11. Keep Runtime Side Effects Deliberate

These calls change live runtime state:

- `ctx.components.setVisible`
- `ctx.components.setZIndex`
- `ctx.components.setStyle`
- `ctx.components.modify`
- `ctx.components.remove`
- `ctx.components.clear`
- `ctx.variables.set`
- `ctx.resources.addPreload`
- `ctx.resources.removePreload`
- `ctx.events.emit` with repair scope
- `ctx.communication.socketSend`
- `ctx.communication.serialSend`
- `ctx.store.set`

Use them intentionally and document assumptions inside your plugin when the behavior is not obvious.

## 12. Preserve Compatibility

Before shipping a plugin:

- Treat `ctx` as optional where possible.
- Use the type-specific SDK type for your plugin kind.
- Avoid long-lived subscriptions in function/transition plugins.
- Avoid depending on undocumented internal fields.
- Use `ctx.app.internal.getAppData()` only when the stable context API cannot express the needed behavior.
- Avoid assuming invisible components are deleted.
- Avoid using `remove` or `clear` as a substitute for hiding.
- Keep plugin errors visible through `ctx.logger` instead of throwing for expected runtime conditions.

## 13. Read Next

- `context-api.md`: detailed context API behavior and side effects.
- `plugin-types.md`: lifecycle and intended usage for each plugin type.
- `compatibility-and-pitfalls.md`: common mistakes and compatibility notes.
