# Runtime main

A runtime plugin can add a main-process entry with the `main` field in `manifest.json`. This gives one runtime plugin two sides:

- a renderer entry, loaded in the play renderer
- a main entry, loaded in the Electron main process

The plugin type is still `runtime`.

Main entries run in the Electron main process and should be treated as trusted code. Use a main entry only when renderer context APIs cannot express the required behavior.

## Manifest

```json
{
    "name": "bridge-plugin",
    "type": "runtime",
    "entry": "src/renderer/index.js",
    "outDir": "dist/renderer",
    "main": {
        "entry": "src/main/index.js",
        "outDir": "dist/main"
    }
}
```

The explicit paths above match the defaults used when `main` is present.

## Renderer entry

The renderer entry exports `RuntimeExport`:

```ts
import type { RuntimeExport } from "@fainthit/repair2-plugin-sdk";
import type { Attr, Main, Renderer } from "./plugin-types";

const plugin: RuntimeExport<Attr, Main, Renderer> = {
    async activate({ ctx, main }) {
        const value = await main?.readValue();
        ctx.logger.info(value);
    },
    renderer: {
        notify(message) {
            console.log(message);
        }
    }
};

export default plugin;
```

`main` is `null` when the plugin has no active main entry. If your plugin requires main-side behavior, keep the manifest and type definitions together.

## Main entry

The main entry exports `RuntimeMainExport`:

```ts
import type { RuntimeMainExport } from "@fainthit/repair2-plugin-sdk";
import type { Attr, Main, Renderer } from "./plugin-types";

const main: RuntimeMainExport<Attr, Main, Renderer> = {
    activate({ renderer }) {
        renderer.notify("main activated");
    },
    main: {
        readValue() {
            return "value from main";
        }
    }
};

export default main;
```

The main context is intentionally small. It currently provides lifecycle cleanup. Main entry cleanup should use `ctx.lifecycle.onDispose` or a disposer returned from `activate()`.

## Shared method maps

Define shared method map types and import them on both sides:

```ts
export type Attr = {
    label: string;
};

export type Main = {
    readValue(): string;
};

export type Renderer = {
    notify(message: string): void;
};
```

This is what gives completion across the two files. TypeScript does not inspect one default export and automatically wire it to the other file.

## Call direction

Renderer code calls main methods through `main`:

```ts
const value = await main?.readValue();
```

Renderer-to-main calls cross IPC and always return promises. They target the main instance paired with the current renderer activation.

Main code calls renderer methods through `renderer`:

```ts
renderer.notify("ready");
```

Main-to-renderer calls are fire-and-forget. Main cannot observe renderer return values or await renderer completion. Design renderer methods as commands or notifications.

If main code needs a result, design a renderer-to-main request path and let the renderer call a main method with the result.

The renderer method list is captured from the `renderer` object during activation. Define renderer methods before activation and keep the bridge method objects stable.

## Activation order

For each renderer activation request, REPAIR2 creates a new main runtime instance for that plugin and disposes the previous one. Main `activate()` runs before renderer `activate()` finishes.

If main `activate()` calls a renderer method, REPAIR2 queues the call until renderer `activate()` has completed. Renderer methods should still be idempotent commands and should tolerate disposal before delivery.

The main runtime instance follows the renderer runtime lifecycle. When the renderer runtime instance is replaced or disposed, the paired main instance is disposed too.

During HMR, a main-side rebuild causes REPAIR2 to reload the main entry and replace the renderer runtime side as well. A renderer-side rebuild replaces the renderer runtime side; the existing main module is not necessarily re-imported, but the main instance is still recreated because activation follows the renderer lifecycle.

The renderer entry may also be activated more than once over its lifetime. A later renderer `activate()` call does not mean that REPAIR2 re-imported the renderer module. The factory may run before main activation, and should not be used for main/renderer coordination. Do not use module-level mutable variables to model activation lifetime; keep activation state inside the activated object, inside `activate()`, or in runtime-owned storage such as `ctx.store`.

## Factories

Both sides may export factories. Renderer runtime factories may be async. Runtime main factories are expected to return the main export object synchronously.

```ts
import type { RuntimeExport } from "@fainthit/repair2-plugin-sdk";

const plugin: RuntimeExport = () => ({
    activate({ ctx }) {
        ctx.logger.info("renderer activated");
    }
});

export default plugin;
```

```ts
import type { RuntimeMainExport } from "@fainthit/repair2-plugin-sdk";

const main: RuntimeMainExport = () => ({
    activate({ ctx }) {
        ctx.lifecycle.onDispose(() => {});
    }
});

export default main;
```
