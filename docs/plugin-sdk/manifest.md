# Manifest

Every plugin directory has a `manifest.json` file. REPAIR2 reads this file to decide what to build and how to load the plugin.

Manifest files are JSON. JavaScript and TypeScript manifest files are not supported yet, but support is planned for a future release.

## Schema

Use the schema for editor completion and authoring-time validation:

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-plugin",
    "type": "function"
}
```

The schema describes the public manifest shape. Current runtime loading does not validate the full schema. REPAIR2 reads `manifest.json`, parses JSON, checks for `name` and `type`, checks that `type` is one of the known plugin types, then owns default normalization, build paths, and runtime registration.

## Common fields

```json
{
    "name": "my-plugin",
    "description": "Adds a custom labeled element.",
    "type": "element",
    "entry": "src/index.js",
    "outDir": "dist",
    "attributes": ["label"]
}
```

`name` is the plugin id. REPAIR2 identifies plugins by the manifest name, not by the directory name. Plugin names should be globally unique across all plugin types. If two manifests use the same name, REPAIR2 reports a duplicate-name warning and does not guarantee which plugin will be selected.

Scaffolded plugin names are normalized to lowercase kebab-case. The schema documents the recommended public shape; current runtime loading requires a non-empty `name` and a known plugin `type`.

`description` is an optional human-readable plugin description.

`type` must be one of:

- `runtime`
- `element`
- `frame`
- `function`
- `transition`

`entry` is the source entry path relative to the plugin root. REPAIR2 builds this entry with Vite and imports the built JavaScript output.

`outDir` is the renderer/plugin output directory relative to the plugin root.

`attributes` declares public attribute names shown or configured by the REPAIR2 editor for the plugin's default export. At runtime, the stored payload object is passed to plugin code as `attributes`. The manifest declaration does not type-check, validate, or filter that runtime payload.

`attr` is a legacy alias for `attributes`. Prefer `attributes`. If both fields are present, `attributes` wins and `attr` is ignored.

## Renderer exports

Element, frame, function, and transition plugins can expose more than one renderer execution point from the same plugin entry. Declare them with `exports` when the plugin has named exports in addition to, or instead of, `default`:

```json
{
    "name": "button-pack",
    "type": "element",
    "exports": ["primary", "secondary"]
}
```

The plugin entry must export every declared name:

```js
export function primary({ attributes, ctx }, options) {}
export function secondary({ attributes, ctx }, options) {}
```

Use the object form when each export needs its own editor attribute inputs:

```json
{
    "name": "button-pack",
    "type": "element",
    "exports": {
        "primary": ["label", "color"],
        "secondary": ["label"]
    }
}
```

If `exports` is not present, REPAIR2 treats the plugin as if it declared:

```json
{
    "exports": {
        "default": ["label"]
    }
}
```

In that default-only case, using `attributes` is the simpler form. Use `exports` when the plugin has multiple public execution points or when a named export needs its own attributes.

Runtime plugins do not support `exports`. They always use the default renderer export. Runtime callable steps are declared separately with `steps`.

## Default paths

For plugins without a runtime main entry, the default paths are:

```json
{
    "entry": "src/index.js",
    "outDir": "dist"
}
```

For runtime plugins with `main`, the default renderer paths are:

```json
{
    "entry": "src/renderer/index.js",
    "outDir": "dist/renderer"
}
```

The default main paths are:

```json
{
    "main": {
        "entry": "src/main/index.js",
        "outDir": "dist/main"
    }
}
```

You can write these paths explicitly, but you do not have to.

## Runtime steps

Runtime plugins can declare callable step names with `steps`:

```json
{
    "name": "window-tools",
    "type": "runtime",
    "steps": {
        "open": ["target"],
        "close": null
    }
}
```

The object form maps each step name to the attribute input names the editor should show for that step. This is not a payload schema and it does not generate a method signature.

The runtime plugin object should define methods with the same names:

```js
export default {
    open({ attributes }) {},
    close() {}
};
```

Array form is also allowed when you only need step names and no step-specific attribute inputs:

```json
{
    "steps": ["open", "close"]
}
```

## Runtime main entry

A runtime plugin can add a main-process entry:

```json
{
    "name": "bridge-plugin",
    "type": "runtime",
    "main": {
        "entry": "src/main/index.js",
        "outDir": "dist/main"
    }
}
```

This is still a `runtime` plugin. The `main` field adds a main-process side to the plugin.

When `main` is present, REPAIR2 builds both the renderer entry and the main entry.

## Svelte

Element and frame plugins can set `svelte: true`:

```json
{
    "name": "svelte-element",
    "type": "element",
    "svelte": true
}
```

When enabled, REPAIR2 adds the Svelte Vite plugin while building the plugin source. It does not create a separate plugin type or change the runtime export contract.
