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

Element plugins are tied to the element lifecycle. REPAIR2 clears the host `target` before mounting the plugin. Long-lived plugin resources should be registered with `ctx.lifecycle.onDispose` or cleaned up by a function returned from `mount()` so HMR and replacement cleanup works.

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

Use frame plugins for component-level layout and chrome. As with element plugins, register long-lived work with `ctx.lifecycle.onDispose` or return a cleanup function. Cleanup should only release DOM, listeners, resources, and references created by the frame plugin. Avoid putting project-wide coordination in a frame; use a runtime plugin for that.

## Rendering resources in plugin DOM

The play runtime defines `<repair-asset>`, a custom element that lets plugins quickly render REPAIR2 image and video resources inside plugin-created DOM.

```html
<repair-asset src="logo"></repair-asset>
<repair-asset src="intro-video" volume="0.5" loop></repair-asset>
```

`src` selects the resource by runtime resource title. `<repair-asset>` renders the matching resource as an internal `<img>` or `<video>` element.

By default, REPAIR2 uses a preloaded asset when one exists. After the asset element is created, the consumed preload is removed, matching the normal "remove preload after creation" behavior for REPAIR2 assets.

Use `clone` when the preload should remain available after `<repair-asset>` consumes it. When `clone` is truthy, `<repair-asset>` consumes the current preloaded asset and then creates a new preload for the same resource.

Use `notpreload` to skip preload consumption. When `notpreload` is truthy, `<repair-asset>` creates a new `<img>` or `<video>` element instead of consuming a preloaded one.

Boolean-style attributes are string-based. An attribute is treated as true when it exists and its value is not `"false"`.

```html
<repair-asset src="logo" clone></repair-asset>
<repair-asset src="logo" clone="false"></repair-asset>
<repair-asset src="logo" notpreload></repair-asset>
```

For video resources, `volume` controls playback volume. The default is `1`. `0` is silent, `1` is the normal media volume, and values greater than `1` are allowed. When `volume` is greater than `1`, REPAIR2 creates an `AudioContext` and applies the value through a `GainNode`.

`loop` toggles looping for video resources.

```html
<repair-asset src="intro-video" volume="0"></repair-asset>
<repair-asset src="intro-video" volume="1"></repair-asset>
<repair-asset src="intro-video" volume="2" loop></repair-asset>
```

By default, the internal asset is stretched to the size of `<repair-asset>` using `width: 100%` and `height: 100%`.

Use `anchor` when the asset should keep its original ratio while sizing against one axis.

| `anchor` | Behavior |
| -------- | -------- |
| unset    | Stretches the internal asset to both the width and height of `<repair-asset>`. |
| `width`  | Uses the width of `<repair-asset>` and automatically calculates height from the asset ratio. |
| `height` | Uses the height of `<repair-asset>` and automatically calculates width from the asset ratio. |
| `none`   | Uses the original asset size. |

```html
<repair-asset src="logo" style="width: 300px; height: 200px;"></repair-asset>
<repair-asset src="logo" anchor="width" style="width: 300px;"></repair-asset>
<repair-asset src="logo" anchor="height" style="height: 200px;"></repair-asset>
<repair-asset src="logo" anchor="none"></repair-asset>
```

`<repair-asset>` defaults to `object-fit: contain` and `object-position: center`. The internal `<img>` or `<video>` inherits those values, so normal CSS can adjust fit and positioning.

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

`ctx.components.subscribe()` is useful for component list changes such as creation, removal, and replacement.

Use runtime plugins for global coordination. Avoid rebuilding your own component system or mutating internal app data when a `ctx` API can express the behavior.

Renderer runtime cleanup can be registered through `ctx.lifecycle.onDispose`, returned from `activate()`, or provided as `dispose`. Prefer lifecycle cleanup or an `activate()` return value for activation-scoped work.

## Runtime plugins with `main`

A runtime plugin can also have a main-process entry by adding `main` to its manifest. It is still the same runtime plugin, with its behavior extended into the main process through the `main` option.

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
