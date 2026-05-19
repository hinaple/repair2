# @fainthit/repair2-plugin-sdk

Type contracts and small development helpers for REPAIR v2 plugins.

The SDK describes the public plugin surface. The play renderer creates the real `ctx` object; the SDK does not import REPAIR internals.

## How Plugins Use This SDK

Installed REPAIR copies the SDK into app data:

```text
%APPDATA%/repair2/sdk/repair2-plugin-sdk
```

Project plugins live under:

```text
%APPDATA%/repair2/project/plugins/{pluginType}
```

Vanilla JS plugins are single runtime files. They should usually use JSDoc type imports from the app-data SDK package and should not runtime-import SDK helpers. From `project/plugins/elements/my-plugin.js`, the SDK path is:

```js
/** @typedef {import("../../../sdk/repair2-plugin-sdk").RepairElementPluginContext} RepairElementPluginContext */
```

Svelte plugin source projects live under `project/plugins/svelte-plugins/{name}` and have a build step, so they can install and import the package. New Svelte plugin projects should point to the app-data SDK:

```json
{
    "devDependencies": {
        "@fainthit/repair2-plugin-sdk": "file:../../../../sdk/repair2-plugin-sdk"
    }
}
```

## Runtime Plugin Sketch

```js
// @ts-check
/** @typedef {import("../../../sdk/repair2-plugin-sdk").RepairRuntimePlugin} RepairRuntimePlugin */

/** @type {RepairRuntimePlugin} */
export default {
    activate({ ctx }) {
        return ctx.components.subscribe((components) => {
            ctx.logger.info(
                "Current components:",
                components.map((component) => component.id)
            );
        });
    }
};
```

## Svelte/Build Plugin Helper Sketch

```js
import { defineElementPlugin } from "@fainthit/repair2-plugin-sdk";

export default defineElementPlugin(MyElement);
```

Helpers mainly preserve types and perform light development validation. They do not register plugins by themselves; REPAIR still loads built plugins from project plugin directories.

## Context Availability

Current context APIs:

- `ctx.plugin`
- `ctx.component`
- `ctx.element`
- `ctx.frame`
- `ctx.logger`
- `ctx.events`
- `ctx.components`
- `ctx.variables`
- `ctx.resources`
- `ctx.app`
- `ctx.communication`
- `ctx.store`
- `ctx.services`
- `ctx.lifecycle`

The SDK exposes type-specific contexts such as `RepairRuntimePluginContext`, `RepairElementPluginContext`, `RepairFramePluginContext`, `RepairFunctionPluginContext`, and `RepairTransitionPluginContext`. `RepairPluginContext` remains as a compatibility union type.

Runtime plugins receive a call argument object. The current runtime calls `activate({ attributes, modules, ctx })`, so destructure `ctx` from that object.

## More Docs

- `docs/plugin-authoring-guide.md`: start-to-finish plugin authoring flow.
- `docs/plugin-types.md`: when to use each plugin type and what lifecycle is safe.
- `docs/context-api.md`: context API behavior, side effects, and cleanup rules.
- `docs/compatibility-and-pitfalls.md`: common mistakes and compatibility notes.
- `docs/ko/`: Korean translations.
