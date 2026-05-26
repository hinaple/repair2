# Type usage

The SDK is designed so that the types are the reference. The docs show the common shapes and the important rules. Your editor should show the exact fields available on `ctx`, `attributes`, `main`, and `renderer`.

## JavaScript with JSDoc

Use `// @ts-check` and a JSDoc type import:

```js
// @ts-check
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport<{ message: string }>} */
export default {
    function({ attributes, ctx }) {
        ctx.logger.info(attributes.message);
    }
};
```

This keeps the runtime file plain JavaScript while giving you completion and type checking.

For longer generic types, define local typedefs first:

```js
// @ts-check
/** @typedef {{ message: string }} Attr */
/** @typedef {import("@fainthit/repair2-plugin-sdk").FunctionExport<Attr, boolean>} Plugin */

/** @type {Plugin} */
export default {
    function({ attributes }) {
        return !!attributes.message;
    }
};
```

## TypeScript

In TypeScript, import types directly:

```ts
import type { RuntimeExport } from "@fainthit/repair2-plugin-sdk";

type Attr = {
    title: string;
};

const plugin: RuntimeExport<Attr> = {
    activate({ attributes, ctx }) {
        ctx.logger.info(attributes.title);
    }
};

export default plugin;
```

## Attribute payloads

`Attributes` means the payload object passed to the plugin at runtime. It is not the manifest's `attributes` declaration list.

```ts
type Attr = {
    label: string;
    count: number;
};
```

Use a small local `Attr` type for each plugin or each call shape.

## Runtime steps

Runtime step methods are normal methods on the runtime plugin object. The method name must match a step declared in the plugin manifest.

Use `RuntimeStep` when you want type checking for step methods:

```ts
import type { RuntimeExport, RuntimeStep } from "@fainthit/repair2-plugin-sdk";

type Attr = {
    label: string;
};

type Steps = {
    showLabel: RuntimeStep<Attr, boolean>;
};

const plugin: RuntimeExport<Attr, {}, {}, Steps> = {
    activate() {},
    showLabel({ attributes, ctx }) {
        ctx.logger.info(attributes.label);
        return true;
    }
};

export default plugin;
```

In other words, the manifest declares what the app can call, and the type tells your editor what the method receives.

## Runtime main bridge

For runtime plugins with a main entry, define shared method map types and use them on both sides.

```ts
// src/plugin-types.ts
export type Attr = {
    str: string;
};

export type Main = {
    foo(str: string): number;
};

export type Renderer = {
    bar(value: number): void;
};
```

Renderer entry:

```ts
import type { RuntimeExport } from "@fainthit/repair2-plugin-sdk";
import type { Attr, Main, Renderer } from "../plugin-types";

const plugin: RuntimeExport<Attr, Main, Renderer> = {
    async activate({ main }) {
        const value = await main?.foo("hello");
    },
    renderer: {
        bar(value) {
            console.log(value);
        }
    }
};

export default plugin;
```

Main entry:

```ts
import type { RuntimeMainExport } from "@fainthit/repair2-plugin-sdk";
import type { Attr, Main, Renderer } from "../plugin-types";

const main: RuntimeMainExport<Attr, Main, Renderer> = {
    activate({ renderer }) {
        renderer.bar(123);
    },
    main: {
        foo(str) {
            return str.length;
        }
    }
};

export default main;
```

The two files are not linked automatically by TypeScript. The shared method map is what gives both sides completion.

Renderer calls to `main` are typed as promises:

```ts
const value = await main?.foo("hello");
```

Main calls to `renderer` are typed as `void`:

```ts
renderer.bar(123);
```

That matches the current runtime bridge behavior.

See [Runtime main](./runtime-main.md) for the full bridge behavior.

## Factory exports

Runtime, function, transition, and runtime main entries may export either an object or a factory that returns the object.

```js
// @ts-check
/** @type {import("@fainthit/repair2-plugin-sdk").RuntimeExport} */
export default () => ({
    activate({ ctx }) {
        ctx.logger.info("activated");
    }
});
```

Function and transition factories follow the same rule:

```js
// @ts-check
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport} */
export default () => ({
    function({ ctx }) {
        ctx.logger.info("called");
    }
});
```

For function plugins, the object must have a `function` property. A bare function as the default export is not part of the contract.

```js
// @ts-check
/** @type {import("@fainthit/repair2-plugin-sdk").TransitionExport} */
export default () => ({
    keyframes: [{ opacity: 0 }, { opacity: 1 }]
});
```

Runtime main entries can also be factories:

```ts
import type { RuntimeMainExport } from "@fainthit/repair2-plugin-sdk";

const main: RuntimeMainExport = () => ({
    activate({ ctx }) {
        ctx.lifecycle.onDispose(() => {});
    }
});

export default main;
```

Element and frame plugins are different. They must export constructors, because REPAIR2 creates them with `new`.

Renderer runtime, function, and transition factories may be async when the SDK type allows it. Runtime main factories should return the main export object synchronously.

## Element and frame types

```js
// @ts-check
/** @typedef {import("@fainthit/repair2-plugin-sdk").FrameOptions} FrameOptions */

export default class Frame extends HTMLElement {
    /** @param {FrameOptions} [options] */
    constructor({ ctx } = {}) {
        super();
        this.dataset.plugin = ctx?.plugin.id ?? "";
    }
}
```

Constructor parameters are best typed with `ElementOptions` or `FrameOptions`. The export contract is still `ElementExport` or `FrameExport`, but constructor argument completion comes from the options type.

## Context

The context object is injected by REPAIR2. You should not construct it yourself.

```ts
import type { PluginContext } from "@fainthit/repair2-plugin-sdk";

function logPlugin(ctx: PluginContext) {
    ctx.logger.info(ctx.plugin.id);
}
```

Prefer stable context APIs. `ctx.app.internal.getAppData()` is available as an escape hatch, but it exposes internal mutable app data and is not a stable public contract.

Use `PluginContext` for helpers that can receive any plugin context. Use `RuntimeContext`, `ElementContext`, `FrameContext`, `FunctionContext`, or `TransitionContext` when the helper is tied to a specific plugin type.

See [Context](./context.md) for the context API guide.
