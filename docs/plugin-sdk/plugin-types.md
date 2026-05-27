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

This is useful for custom controls, visual widgets, media views, and small interactive surfaces. An element plugin exports a mount function. REPAIR2 calls it when the plugin should render into the element host.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").ElementExport} */
export default function mount({ attributes, ctx }, { target, dispatchEvent }) {
    target.textContent = attributes.label ?? ctx.plugin.id;

    const onClick = () => {
        dispatchEvent("click");
    };
    target.addEventListener("click", onClick);

    return () => {
        target.removeEventListener("click", onClick);
    };
}
```

The first argument contains `attributes` and the injected `ElementContext`. The second argument contains the host `target` and a plugin listener-channel `dispatchEvent`. `dispatchEvent` is not the native DOM method; use `target.dispatchEvent()` when you need native DOM dispatch.

Element plugins are tied to the element lifecycle. Long-lived plugin resources should be registered with `ctx.lifecycle.onDispose` or cleaned up by a function returned from `mount()` so HMR and replacement cleanup works.

Use element plugins for local UI. Avoid using them as global controllers.

## Frame plugins

Use a frame plugin when you need to wrap a whole component. If a component has a frame plugin, child elements are rendered inside the frame element.

This is useful for component containers, window-like chrome, layout shells, and component-level visual treatment.

Frame plugins also export a mount function. They receive a `FrameContext`, including the component identity and frame identity, and a `children` document fragment containing the component elements.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FrameExport} */
export default function mount({ ctx }, { target, children, showIntro }) {
    target.classList.toggle("intro", showIntro);

    const body = document.createElement("div");
    body.className = "frame-body";
    body.append(children);
    target.append(body);

    return () => {
        body.remove();
    };
}
```

Frame plugins should append `children` to the correct initial location. Treat those nodes as runtime-owned component elements: do not destroy, store for later mutation, or otherwise side-effect them beyond initial placement.

Use frame plugins for component-level layout and chrome. As with element plugins, register long-lived work with `ctx.lifecycle.onDispose` or return a cleanup function. Avoid putting project-wide coordination in a frame; use a runtime plugin for that.

## Function plugins

Use a function plugin for short-lived logic called from steps, listeners, or similar execution paths.

Function plugins export an object with a `function` property, or a factory returning that object:

```js
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

The function receives the stored plugin pointer payload as `attributes` and an injected function context as `ctx`. It may also receive a `signal` from step execution or reset cancellation paths. When called as an element listener plugin, it receives the configured `channel` and the event-like listener payload.

Use function plugins for calculations, checks, small async actions, and listener conditions. Avoid long-lived subscriptions unless you clean them up before the call finishes.

## Transition plugins

Use a transition plugin to provide animation keyframes or generate them from attributes.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").TransitionExport} */
export default {
    keyframes: [{ opacity: 0 }, { opacity: 1 }]
};
```

You can also export a `function` property that returns keyframes. The function receives `{ attributes, ctx, ...argument }` and may return a promise. The current runtime also accepts a function that returns the keyframe array. Direct keyframe array default exports are not part of the current contract.

Use transition plugins for animation output. Avoid component mutation, project events, or long-lived side effects.

## Runtime plugins

Use a runtime plugin for project-wide behavior. Runtime plugins are activated from project configuration and can observe or coordinate components, variables, resources, events, communication, store state, and plugin services.

This is useful for taskbars, inspectors, global window managers, dashboards, cross-plugin services, and project-wide event coordination.

Runtime plugins may export an object or a factory:

```js
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
| `element`            | mount function                                  |
| `frame`              | mount function                                  |
| `function`           | object with `function`, or factory returning it |
| `transition`         | object with `keyframes`/`function`, or factory  |
| `runtime`            | object or factory                               |
| runtime `main` entry | object or factory                               |
