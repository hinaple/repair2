# Getting started

This package contains the public authoring types for REPAIR2 plugins. It does not provide a runtime library. REPAIR2 loads plugins from plugin directories, builds them, and passes a `ctx` object to plugin code when it runs.

In most cases, you should write plugins with the SDK types open in your editor and use these pages as guidance for choosing the right shape.

## Install the SDK

Install the SDK in your plugin project:

```sh
npm install --save-dev @fainthit/repair2-plugin-sdk
```

Your plugin package should usually be an ES module package. The version range should match the SDK version you support:

```json
{
    "name": "my-plugin",
    "type": "module",
    "devDependencies": {
        "@fainthit/repair2-plugin-sdk": "^0.2.0"
    }
}
```

The package is type-first. Importing types is the normal way to use it:

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport} */
export default {
    function({ ctx }) {
        ctx.logger.info("hello from a function plugin");
    }
};
```

## Plugin directory

A plugin is a directory with a `manifest.json` file and source code. The manifest tells REPAIR2 what kind of plugin it is and where the entry file is.

```text
my-plugin/
  manifest.json
  package.json
  src/
    index.js
```

For a runtime plugin with a main-process entry, the directory usually has two source entries:

```text
my-runtime-plugin/
  manifest.json
  package.json
  src/
    renderer/
      index.js
    main/
      index.js
```

`runtime` with `main` is still a runtime plugin. It is not a separate plugin type.

## Manifest

Plugin manifests are JSON files. Use the schema for editor completion and authoring-time validation:

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-plugin",
    "type": "function"
}
```

The app currently reads `manifest.json` as JSON and validates only the required runtime loading fields. JavaScript or TypeScript manifest files are not part of the runtime contract.

The smallest useful manifests look like this:

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-element",
    "type": "element"
}
```

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-runtime",
    "type": "runtime",
    "steps": {
        "show": ["message"]
    }
}
```

For a runtime plugin with a main-process entry, add `main`:

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-runtime-main",
    "type": "runtime",
    "entry": "src/renderer/index.js",
    "outDir": "dist/renderer",
    "main": {
        "entry": "src/main/index.js",
        "outDir": "dist/main"
    }
}
```

Element and frame plugins can set `svelte: true`. This lets REPAIR2 add the Svelte Vite plugin while building the plugin source. It does not create a separate plugin type.

See [Manifest](./manifest.md) for the full manifest guide.

## Build and load

REPAIR2 owns the plugin build and load path. It reads the manifest, builds the declared entry with Vite, then imports the built JavaScript output. In development mode, plugin changes can trigger hot replacement.

For normal plugins, the default source entry is `src/index.js` and the default output directory is `dist`. For runtime plugins with `main`, the default renderer entry is `src/renderer/index.js`, the default renderer output is `dist/renderer`, the default main entry is `src/main/index.js`, and the default main output is `dist/main`.

Your plugin should export the shape that matches its manifest type:

- `runtime`: `RuntimeExport`
- `element`: `ElementExport`
- `frame`: `FrameExport`
- `function`: `FunctionExport`
- `transition`: `TransitionExport`

Use the type name as the reference. The docs explain when to use each shape, but the exact callable surface should come from the SDK types.

## Source formats

Plain JavaScript is enough for plugins. JSDoc type imports can document the expected plugin shape without adding a separate TypeScript build step.

TypeScript is also fine when Vite can handle your source entry. JavaScript is the output format; plugin authors do not need a separate build step unless their source setup requires work outside Vite's normal handling.

## A minimal function plugin

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport} */
export default {
    function({ attributes, ctx }) {
        ctx.logger.info("function plugin ran", attributes);
        return true;
    }
};
```

Function plugins are short-lived. If you subscribe to anything, clean it up before the function returns unless you have a very specific reason not to.

## A minimal element plugin

```js
/** @type {import("@fainthit/repair2-plugin-sdk").ElementExport<{ label?: string }>} */
export default function mount({ attributes, ctx }, { target, dispatchEvent }) {
    target.textContent = attributes.label ?? ctx.plugin.id;

    const onClick = () => dispatchEvent("click");
    target.addEventListener("click", onClick);

    return () => {
        target.removeEventListener("click", onClick);
    };
}
```

Element plugins are mount functions. REPAIR2 calls them with `{ attributes, ctx }` and `{ target, dispatchEvent }`. The returned function, when present, is called during plugin cleanup.

Frame plugins use the same mount shape, but receive `{ target, children, showIntro }` as the second argument. Append `children` to the location where the component elements should render.

## Type references

Plain JavaScript plugins can use JSDoc type imports as references. TypeScript plugins can import SDK types directly.

If your editor does not pick up DOM types such as `HTMLElement`, make sure your TypeScript configuration includes the `DOM` library.

## Next steps

- [Plugin types](./plugin-types.md) explains which plugin type to choose.
- [Type usage](./type-usage.md) shows the common type patterns.
- [Context](./context.md) explains the injected `ctx` object.
- [Runtime main](./runtime-main.md) explains runtime plugins with main-process entries.
- [Compatibility and pitfalls](./compatibility-and-pitfalls.md) lists the rules that are easiest to miss.
