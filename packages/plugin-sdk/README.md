# @fainthit/repair2-plugin-sdk

Type-first authoring contracts for REPAIR2 plugins.

This package provides TypeScript and JSDoc type definitions for plugin authors. It describes the public plugin shapes, injected context APIs, runtime bridge contracts, and manifest schema used by REPAIR2.

The package is intentionally type-only. It does not register plugins, load manifests, build source files, or provide runtime helpers. REPAIR2 supplies those behaviors when the plugin is installed and executed.

## Install

```sh
npm install --save-dev @fainthit/repair2-plugin-sdk
```

## Usage

Use JSDoc type imports from JavaScript plugin code:

```js
// @ts-check
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport} */
export default {
    function({ ctx }) {
        ctx.logger.info("hello");
    }
};
```

Or import types from TypeScript:

```ts
import type { RuntimeExport } from "@fainthit/repair2-plugin-sdk";

const plugin: RuntimeExport = {
    activate({ ctx }) {
        ctx.logger.info("runtime activated");
    }
};

export default plugin;
```

Plugin exports may be plain objects or factory functions, depending on the plugin type. The exported SDK types model both forms where the runtime supports them.

## Manifest schema

Use the schema in `manifest.json` for editor completion and validation:

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-plugin",
    "type": "function"
}
```

The schema is exported as `@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json`.

## Main types

- `RuntimeExport`
- `ElementExport`
- `FrameExport`
- `FunctionExport`
- `TransitionExport`
- `RuntimeMainExport`
- `PluginContext`

## Context

Plugin code receives `ctx` from REPAIR2 at runtime. `PluginContext` is the shared context surface, while more specific context types narrow the available APIs for runtime, element, frame, function, and transition plugins.

The SDK types describe the contract only. A plugin should use the injected `ctx` value instead of constructing context objects itself.
