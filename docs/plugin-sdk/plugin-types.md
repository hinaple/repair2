# Plugin types

REPAIR2 has five plugin types:

- `runtime`
- `element`
- `frame`
- `function`
- `transition`

Choose the smallest type that matches the work. A plugin that only needs to render inside one element should not be a runtime plugin. A plugin that coordinates the whole play runtime should not be hidden inside a frame.

## Element plugins

Use an element plugin when you need custom DOM inside one component element.

This is useful for custom controls, visual widgets, media views, and small interactive surfaces. An element plugin is an `HTMLElement` constructor. REPAIR2 creates it and inserts it into the component.

```js
// @ts-check
/** @typedef {import("@fainthit/repair2-plugin-sdk").ElementOptions} ElementOptions */

export default class MyElement extends HTMLElement {
    /** @param {ElementOptions} [options] */
    constructor({ ctx } = {}) {
        super();
        this.textContent = ctx?.plugin.id ?? "element";
    }
}
```

Element plugins are tied to the element lifecycle. DOM lifecycle callbacks are useful, but long-lived plugin resources should also be registered with `ctx.lifecycle.onDispose` so HMR and replacement cleanup works.

Use element plugins for local UI. Avoid using them as global controllers.

## Frame plugins

Use a frame plugin when you need to wrap a whole component. If a component has a frame plugin, child elements are rendered inside the frame element.

This is useful for component containers, window-like chrome, layout shells, and component-level visual treatment.

Frame plugins are also `HTMLElement` constructors. They receive a `FrameContext`, including the component identity and frame identity.

Use frame plugins for component-level layout and chrome. As with element plugins, register long-lived work with `ctx.lifecycle.onDispose`. Avoid putting project-wide coordination in a frame; use a runtime plugin for that.

## Function plugins

Use a function plugin for short-lived logic called from steps, listeners, or similar execution paths.

Function plugins export an object with a `function` property, or a factory returning that object:

```js
// @ts-check
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport} */
export default {
    function({ attributes, ctx, signal }) {
        if (signal?.aborted) return false;
        ctx.logger.info("running", attributes);
        return true;
    }
};
```

Bare function exports are not part of the current contract.

The function receives the stored plugin pointer payload as `attributes` and an injected function context as `ctx`. It may also receive a `signal` from step execution or reset cancellation paths. When called as an element listener plugin, it receives the configured `channel` and the DOM `event`.

Use function plugins for calculations, checks, small async actions, and listener conditions. Avoid long-lived subscriptions unless you clean them up before the call finishes.

## Transition plugins

Use a transition plugin to provide animation keyframes or generate them from attributes.

```js
// @ts-check
/** @type {import("@fainthit/repair2-plugin-sdk").TransitionExport} */
export default {
    keyframes: [{ opacity: 0 }, { opacity: 1 }]
};
```

You can also export a `function` property that returns keyframes. The function receives `{ attributes, ctx, ...argument }` and may return a promise. Direct keyframe array default exports are not part of the current contract.

Use transition plugins for animation output. Avoid component mutation, project events, or long-lived side effects.

## Runtime plugins

Use a runtime plugin for project-wide behavior. Runtime plugins are activated from project configuration and can observe or coordinate components, variables, resources, events, communication, store state, and plugin services.

This is useful for taskbars, inspectors, global window managers, dashboards, cross-plugin services, and project-wide event coordination.

Runtime plugins may export an object or a factory:

```js
// @ts-check
/** @type {import("@fainthit/repair2-plugin-sdk").RuntimeExport} */
export default {
    activate({ ctx }) {
        return ctx.components.subscribe((components) => {
            ctx.logger.info("components", components.length);
        });
    }
};
```

Use runtime plugins for global coordination. Avoid rebuilding your own component system or mutating internal app data when a `ctx` API can express the behavior.

Renderer runtime cleanup can be registered through `ctx.lifecycle.onDispose`, returned from `activate()`, or provided as `dispose`. Prefer lifecycle cleanup or an `activate()` return value for activation-scoped work.

## Runtime plugins with `main`

A runtime plugin can also have a main-process entry by adding `main` to its manifest. This does not create a new plugin type. It adds a main-process side to the runtime plugin.

Runtime main entries run in the Electron main process and should be treated as trusted code. Use this only when renderer context APIs cannot express the required behavior. Renderer runtime code gets a `main` API for calling methods exposed by the main entry. The main entry gets a `renderer` API for calling renderer methods.

Renderer to main calls return promises. Main to renderer calls are fire-and-forget: main cannot observe renderer return values or await renderer completion.

Use `main` only when the plugin needs main-process behavior. If all work can happen through the renderer runtime and `ctx`, keep the plugin renderer-only.

See [Runtime main](./runtime-main.md) for bridge typing and activation details.

## Export shapes

| Type                 | Export shape                                    |
| -------------------- | ----------------------------------------------- |
| `element`            | `HTMLElement` constructor                       |
| `frame`              | `HTMLElement` constructor                       |
| `function`           | object with `function`, or factory returning it |
| `transition`         | object with `keyframes`/`function`, or factory  |
| `runtime`            | object or factory                               |
| runtime `main` entry | object or factory                               |
