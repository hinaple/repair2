# Plugin Types

This document explains how each REPAIR plugin type should be used and what lifecycle assumptions are safe.

## Element Plugins

Element plugins render DOM inside a component element.

Use them for:

- custom visual controls
- interactive widgets
- specialized media views
- UI that belongs to a single component element

Element plugins are HTMLElement constructors. They may receive:

- `attributes`
- `modules`
- `ctx`

Treat `ctx` as optional. Element plugins can safely use long-lived subscriptions when they are tied to the element lifecycle. Context disposal should happen when the element is removed or replaced.

Good context usage:

- log mount errors
- listen to plugin-scoped events
- update UI from variables
- read resources
- expose a small service while mounted

Avoid:

- controlling unrelated global runtime state unless that is the plugin's clear purpose
- assuming the element is mounted forever
- storing component handles permanently

## Frame Plugins

Frame plugins wrap a whole component. Child elements render inside the frame when a frame is present.

Use them for:

- custom component containers
- window-like chrome
- layout shells
- component-level visual treatment

Frame plugins receive component identity through `ctx.component`. They are closer to component-level UI than element plugins, so they may reasonably use `ctx.components` to inspect or adjust their own component.

Avoid making a frame plugin responsible for managing all windows globally. Use a runtime plugin for cross-component coordination.

## Runtime Plugins

Runtime plugins activate at the project/play-runtime level.

Use them for:

- taskbars
- global window managers
- runtime inspectors
- cross-plugin services
- project-wide event coordination
- component dashboards

Runtime plugins are the safest place for long-lived subscriptions and services. `activate({ attributes, modules, ctx })` may return a disposer.

Runtime plugins should coordinate existing runtime objects. They can use `ctx.app`, `ctx.communication`, `ctx.store`, events, services, variables, resources, and components to build global behavior. They should not replace project execution, create a parallel component system, or mutate raw project data unless there is no stable context API for the task.

## Function Plugins

Function plugins run as short-lived logic from steps, listeners, or other execution paths.

Use them for:

- calculations
- validation
- small async actions
- custom listener conditions
- integration glue

Function plugins may receive `ctx`, but they should not register app-wide listeners or long-lived subscriptions. If a function plugin subscribes, it should unsubscribe before returning unless the behavior is explicitly designed and safe.

Prefer returning values and letting the caller decide what happens next.

The current runtime supports function plugins exported as an object with a `function` property. Bare function exports are not part of the current contract.

## Transition Plugins

Transition plugins provide keyframes or generate keyframes.

Use them for:

- reusable animation definitions
- attribute-driven transition variants
- dynamic keyframe generation

Transition plugins should stay focused on animation output. Avoid runtime subscriptions, component mutation, or project event emission from transition plugins unless there is a very specific reason.

The current runtime supports transition plugins exported as an object with `keyframes` or a `function` property. `defineTransitionPlugin([...])` is a helper convenience that wraps a keyframe array.

## Choosing Between Runtime And Frame

Use a frame plugin when behavior belongs to one component's container.

Use a runtime plugin when behavior spans multiple components or needs global state.

For example:

- A draggable title bar for one component can be a frame plugin.
- A taskbar listing all open components should be a runtime plugin.

## Choosing Between Events And Services

Use events for broadcast or loosely coupled notifications.

Use services when another plugin needs to call a named API.

Services are global within the play runtime, so use namespaced names.

## Lifecycle Summary

| Plugin Type | Long-lived subscriptions | Typical cleanup |
| --- | --- | --- |
| runtime | Safe | return disposer from `activate` or use `ctx.lifecycle` |
| element | Safe when tied to element | context disposal on element removal/replacement |
| frame | Safe when tied to frame | context disposal on frame removal/replacement |
| function | Avoid | unsubscribe before returning |
| transition | Avoid | usually no long-lived work |
