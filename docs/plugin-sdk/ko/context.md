# 컨텍스트

`ctx`는 REPAIR2가 플러그인 코드 실행 시 전달하는 객체입니다. 플러그인이 global internal에 직접 접근하지 않고 런타임 기능을 사용할 수 있게 해줍니다.

`ctx`를 직접 만들지 마세요. 정확한 context type은 플러그인이 실행되는 위치에 따라 달라집니다.

- `RuntimeContext`
- `ElementContext`
- `FrameContext`
- `FunctionContext`
- `TransitionContext`
- 모든 context type의 union인 `PluginContext`

플러그인 종류를 알고 있다면 구체적인 타입을 사용하세요. 공유 helper function에는 `PluginContext`를 사용하세요.

## Identity

모든 context에는 `ctx.plugin`이 있습니다.

```ts
ctx.plugin.id;
ctx.plugin.type;
ctx.plugin.instanceId;
```

Element 및 frame context에는 placement information도 포함됩니다.

```ts
ctx.component;
ctx.element;
ctx.frame;
```

Runtime context에서는 `component`, `element`, `frame`이 `null`입니다.

## Logger

Plugin diagnostic에는 `ctx.logger`를 사용하세요.

```js
ctx.logger.info("ready");
ctx.logger.warn("missing resource");
ctx.logger.error("failed to start");
```

이 메시지들은 plugin log path를 통과합니다. 중요한 plugin feedback을 `console`에만 쓰는 것보다 보통 더 낫습니다.

Missing resource, variable, service, invalid event usage도 app diagnostic path를 통해 plugin issue로 보고됩니다.

## Lifecycle

Subscription, timer, observer, external resource를 정리하려면 `ctx.lifecycle.onDispose`를 사용하세요.

```js
const interval = setInterval(tick, 1000);
ctx.lifecycle.onDispose(() => clearInterval(interval));
```

Runtime, element, frame plugin은 오래 유지되는 작업을 가지는 경우가 많습니다. Function 및 transition plugin은 보통 짧게 실행되므로 명시적으로 cleanup하지 않는 한 오래 유지되는 작업을 넣지 마세요.

대부분의 플러그인은 `ctx.lifecycle.dispose()`를 직접 호출하기보다 cleanup을 등록해야 합니다. 직접 호출하면 현재 plugin context가 끝나고 등록된 disposer가 실행됩니다.

Context subscription 및 provider API는 disposer를 반환하며 lifecycle cleanup에도 묶여 있습니다. Plugin context disposal보다 일찍 unsubscribe해야 할 때는 반환된 disposer를 보관하세요.

## Events

`ctx.events.emit`의 기본값은 `repair` scope입니다.

```js
ctx.events.emit("door-opened", { id: "A" });
```

`repair` scope는 project event entry를 트리거할 수 있습니다. Plugin-only communication에는 `plugin` 또는 `local`을 사용하세요.

| Scope    | Meaning                                                      |
| -------- | ------------------------------------------------------------ |
| `repair` | Project event scope. Project event entry를 트리거할 수 있습니다. |
| `plugin` | Shared plugin event bus channel.                             |
| `local`  | Instance-local plugin event channel.                         |

```js
ctx.events.emit("changed", data, { scope: "plugin" });

ctx.events.on(
    "changed",
    (event) => {
        ctx.logger.info(event.data);
    },
    { scope: "plugin" }
);
```

Event가 현재 plugin instance에만 scoped되어야 하면 `local`을 사용하세요. 여러 plugin instance가 같은 channel을 통해 통신해야 하면 `plugin`을 사용하세요.

## Services

Service는 play runtime 안에서 공유되는 named value입니다.

```js
ctx.services.provide("my-plugin.counter", {
    increment() {}
});
```

다른 플러그인은 이름으로 service를 사용할 수 있습니다.

```js
const counter = ctx.services.tryUse("my-plugin.counter");
counter?.increment();
```

Namespaced name을 사용하세요. Service name은 play runtime 안에서 전역입니다.

Missing service가 예상되는 plugin issue일 때는 `use`를 사용하세요. 설치 또는 활성화되지 않았을 수 있는 optional integration에는 `tryUse`를 사용하세요.

## Components

`ctx.components`는 live runtime component를 위한 handle lookup API입니다. 더 이상 모든 mutation call에 id를 넘기는 manager처럼 동작하지 않습니다. Component를 한 번 찾고, 반환된 handle을 사용하세요.

```js
const components = ctx.components.list();
const panel = ctx.components.get("panel");

panel?.setVisible(false);
panel?.setPositionBy({ x: 20, y: -10 });
```

`get(aliasOrId)`는 alias 또는 real id로 component를 찾습니다. Element 또는 frame plugin처럼 component-bound context에서는 argument 없이 `get()`을 호출하면 현재 component handle을 반환합니다.

```js
const current = ctx.components.get();
current?.setZIndex(10);
```

일치하는 component가 없으면 `get()`은 `undefined`를 반환합니다.

Component handle은 stable frozen object입니다. Getter는 현재 runtime state를 읽으므로 handle을 보관하고 재사용할 수 있습니다.

```js
const panel = ctx.components.get("panel");

ctx.events.on("toggle-panel", () => {
    panel?.setVisible(!panel.visible);
});
```

Handle state change는 live runtime에만 영향을 줍니다. Project source data를 수정하지 않습니다.

| Handle member | Meaning |
| ------------- | ------- |
| `id` | Alias가 있으면 alias, 없으면 real component id입니다. |
| `realId` | 저장된 project component id입니다. |
| `alias` | Component alias 또는 `null`입니다. |
| `visible` | 현재 runtime visibility입니다. |
| `zIndex` | 현재 runtime z-index입니다. |
| `position` | 현재 runtime position의 snapshot입니다. |
| `destroyed` | Runtime component가 disconnected되고 destroyed된 뒤 truthy입니다. |
| `unbreakable` | 일반 removal이 block되어야 하는지 여부입니다. |
| `hasFrame` | Component가 현재 frame plugin을 가지는지 여부입니다. |
| `elementCount` | Runtime child element 수입니다. |
| `node` | Live component DOM node입니다. Handle method로 표현할 수 없을 때만 사용하세요. |

Runtime state change에는 handle method를 사용하세요.

| Method | Effect |
| ------ | ------ |
| `remove(ignoreUnbreakable?)` | Runtime에서 component를 제거합니다. |
| `setVisible(visible)` | Runtime visibility를 설정합니다. |
| `setZIndex(zIndex)` | Runtime z-index를 설정합니다. |
| `setStyle(style?)` | Runtime override CSS declaration string을 교체합니다. |
| `setPosition(position)` | 하나 또는 두 position axis를 설정합니다. |
| `setPositionBy(delta)` | 현재 position에서 pixel delta만큼 이동합니다. |

`setPosition`은 partial axis data를 받습니다. Number 또는 numeric string은 axis distance를 설정합니다. Object는 `distance`, `origin`, `relative`를 설정할 수 있습니다.

```js
const panel = ctx.components.get("panel");

panel?.setPosition({
    x: { distance: 50, origin: "start" },
    y: { distance: 25, origin: "center", relative: true }
});

panel?.setPositionBy({ x: 10, y: -5 });
```

`origin`은 `"start"`, `"center"`, `"end"` 중 하나입니다. Relative axis는 percentage를 사용하며, 그렇지 않으면 distance는 pixel입니다. `"center"` origin은 해당 axis를 `left`, `right`, `top`, `bottom` declaration으로 내보내는 대신 runtime의 centered flex layout에 맡깁니다.

Getter가 반환한 object는 read snapshot입니다. `handle.position.x.distance`를 mutate해도 component는 움직이지 않습니다. 대신 `setPosition()` 또는 `setPositionBy()`를 사용하세요.

`ctx.components.clear(ignoreUnbreakable?)`는 runtime component를 bulk로 제거합니다. 다른 component mutation API는 각 handle에 있습니다.

`ctx.components.subscribe()`는 component list lifecycle change를 관찰합니다. 현재 handle list로 즉시 실행된 뒤, component가 created, removed, replaced될 때 실행됩니다.

```js
const stop = ctx.components.subscribe((components) => {
    ctx.logger.info("component count", components.length);
});
```

`setVisible()` 또는 `setPosition()` 같은 live handle을 통한 property change는 component subscriber를 트리거하지 않습니다.

## Variables

Variable은 project variable name으로 접근합니다.

```js
const value = ctx.variables.get("score");
ctx.variables.set("score", Number(value ?? 0) + 1);
```

Variable change를 subscribe할 수 있습니다.

```js
ctx.variables.subscribe("score", (value) => {
    ctx.logger.info("score", value);
});
```

Context API를 통해 등록한 subscription은 lifecycle cleanup에 연결됩니다. 더 일찍 unsubscribe해야 할 때는 반환된 disposer를 보관하세요.

## Resources

`ctx.resources`는 runtime resource title로 project resource를 조회합니다.

```js
const image = ctx.resources.get("logo");
const element = ctx.resources.createElement("logo");
```

Resource handle은 현재 runtime state를 설명합니다. 필요한 작업에 가깝게 읽으세요.

Resolved runtime asset path가 필요할 때는 `path` 또는 `getPath()`를 사용하세요. `src`는 저장된 project resource source value입니다.

Preload는 나중에 사용하기 위해 준비된 media element를 저장합니다. `createElement()`는 해당 resource의 기존 preload를 소비할 수 있습니다.

Play runtime은 plugin-created DOM에서 image 및 video resource를 렌더링하기 위한 `<repair-asset>`도 제공합니다. [플러그인 DOM에서 resource 렌더링](./plugin-types.md#플러그인-dom에서-resource-렌더링)을 참고하세요.

## App, communication, store

`ctx.app`은 read-oriented app information을 제공합니다.

```js
ctx.app.devMode;
ctx.app.getConfig();
ctx.app.getScreenSize();
ctx.app.getSizeRatio();
```

`ctx.communication`은 기존 socket 및 serial path를 통해 data를 보냅니다.

```js
ctx.communication.socketSend("channel", "payload");
ctx.communication.serialSend("payload");
```

Communication send API는 fire-and-forget입니다. Plugin에 delivery success를 보고하지 않습니다.

`ctx.store`는 persistent app store value를 읽고 씁니다.

```js
ctx.store.set("my-plugin.enabled", true);
const enabled = await ctx.store.get("my-plugin.enabled");
```

충돌을 피하려면 namespaced store key를 사용하세요.

`ctx.store`는 app-level Electron Store를 기반으로 합니다. Project-local이 아닙니다. `store.get<T>()`는 `Promise<T>`를 반환합니다. Generic type parameter는 authoring-time hint일 뿐입니다. 신뢰할 수 없거나 versioned value는 직접 validate하세요.

## Internal app data

`ctx.app.getConfig()`는 cloned, read-oriented config data를 반환합니다. `ctx.app.internal.getAppData()`는 live mutable internal app data object를 반환합니다. Stable context API로 표현할 수 없을 때만 사용하세요.

플러그인이 internal app data shape에 의존한다면 그 의존성을 compatibility-sensitive로 취급하세요.

## RepairUtils

`RepairUtils`는 runtime access를 위한 이전 global utility surface입니다. Legacy입니다. 새 플러그인은 대신 주입된 `ctx` API를 사용해야 합니다.
