# Component Runtime

The component runtime turns project component data into DOM in the play renderer. It is also the main surface runtime plugins want to observe and control.

## Design Intent

Components remain project-owned runtime objects. Plugins can observe and modify them through context APIs, but the existing step/action path remains the source of component creation.

This preserves compatibility:

- existing `Component.create` steps keep working
- invisible components remain real runtime components even when absent from DOM
- aliases keep their current role in replacement/removal
- unbreakable components keep their protection semantics

Do not introduce a second component system for plugins unless the project data model is intentionally redesigned.

## Ownership

`components.js` owns the runtime component list and DOM insertion/removal from `#gamezone`.

`componentRegistry.js` exposes plugin-safe handles and subscriptions. It exists so plugins can observe components without receiving the mutable internal array.

This split is intentional:

- component manager mutates runtime state
- registry presents stable read handles
- plugin context decides how missing/invalid operations are reported

## Identity

Runtime component identity has two layers:

- `realId`: the stored project uuid
- `id`: plugin-facing id, currently alias-first through `aliasOrId`

Plugin authors usually know aliases, not uuids. Context APIs should therefore accept alias-first ids where possible, while handles still include `realId` for diagnostics and precise tooling.

## Visibility

`visible` controls whether the component is mounted in DOM, not whether the runtime component exists.

This matters because projects may toggle invisibility quickly and expect the component object to persist. Do not treat invisible components as deleted components.

Any future component API must preserve this behavior unless explicitly redesigned.

## Frames And Elements

A component may have a frame plugin. When a frame exists, child elements are rendered inside the frame element. Without a frame, child elements are rendered directly inside the component.

Frame and element plugin contexts receive component/element identity so plugins can understand where they are mounted.

When plugin DOM is replaced by HMR or component removal, old plugin contexts should be disposed.

## Component Context API

`ctx.components` is an adapter over existing runtime component behavior.

Its intent:

- list runtime component handles
- get one component handle by alias-first id or real id
- subscribe to component handle changes
- remove/clear/modify existing components using existing runtime manager functions
- report invalid operations through plugin logs

It should not silently expose the internal array, and it should not create components yet.

## Registry Handle Direction

Component handles should be stable enough for plugin developers but not imply ownership over internals.

Useful handle data:

- plugin-facing id
- real project id
- alias
- visibility
- z-index
- DOM element reference for advanced cases
- metadata such as unbreakable state, frame presence, and child element count

If exposing a field would make plugins depend on fragile internals, put it behind a method or omit it.

## Step Actions And RepairUtils

Step actions are compatibility-critical. They should continue to route through the existing component manager functions and keep existing payload semantics.

`RepairUtils` compatibility is also important. Context APIs may become cleaner over time, but `RepairUtils` should only change deliberately and with behavior changes reported.

## Preview Is Separate

Editor layout preview is not the same as runtime component creation. Preview reconstructs layout for editing support and should not be treated as a source of runtime component handles.

Plugin context APIs should target real play runtime components, not preview-only DOM.

## Compatibility Guidance

- Keep `aliasOrId` behavior stable.
- Do not delete invisible components when hiding them.
- Do not expose the mutable component array to plugins.
- Dispose plugin contexts when plugin DOM is replaced or removed.
- Report context misuse through plugin logs instead of throwing.
- Add component creation APIs only after a deliberate design decision.
