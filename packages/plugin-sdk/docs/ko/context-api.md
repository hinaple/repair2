# REPAIR Plugin SDK Context Guide

이 문서는 `@fainthit/repair2-plugin-sdk`를 사용하는 plugin 개발자를 위한 가이드다. `ctx`를 안전하게 사용하는 방법, 각 API의 side effect, 피해야 할 패턴을 중심으로 설명한다.

SDK는 type과 작은 definition helper를 제공한다. 실제 context object는 REPAIR play renderer가 생성한다.

Vanilla JS plugin은 보통 app-data SDK package를 JSDoc으로 참조한다. 예를 들어 `project/plugins/elements/my-plugin.js`에서는 `import("../../../sdk/repair2-plugin-sdk")`를 사용한다. Svelte plugin source project는 build step이 있으므로 `@fainthit/repair2-plugin-sdk`를 install/import하는 방식도 사용할 수 있다.

## Mental Model

`ctx`는 play runtime을 제어된 방식으로 보는 창이다. App state의 복사본도 아니고 REPAIR internals의 ownership도 아니다.

사용하기 좋은 곳:

- 기존 runtime component 관찰
- 기존 runtime component 제어
- runtime variable을 name으로 read/write
- resource element 생성과 preload 관리
- app runtime state 조회
- socket/serial data 전송
- main-owned persistent store 사용
- project event 또는 plugin-scoped event로 통신
- plugin-to-plugin service 제공
- long-lived work cleanup 등록

피해야 할 것:

- raw project data 직접 mutation
- stale handle을 영구 보관
- parallel component system 생성
- 모든 REPAIR version에 모든 API가 있다고 가정
- expected plugin misuse path에서 throw

## Plugin Type별 Context

Runtime, element, frame plugin은 long-lived context API를 사용하기 가장 안전한 위치다.

Element와 frame plugin constructor는 compatibility를 위해 `ctx`를 optional로 취급한다.

```js
constructor({ attributes = {}, ctx = null } = {}) {
    super();
    this.ctx = ctx;
}
```

Function과 transition plugin도 `ctx`를 받을 수 있지만 보통 short-lived execution helper다. Function/transition plugin에서 long-lived subscription을 등록하는 것은 즉시 dispose할 수 있는 경우가 아니라면 피한다.

## Cleanup And Auto-Unsubscribe

다음 context method는 unsubscribe/dispose function을 자동으로 `ctx.lifecycle`에 등록한다.

- `ctx.events.on(...)`
- `ctx.components.subscribe(...)`
- `ctx.variables.subscribe(...)`
- `ctx.services.provide(...)`

즉 element/frame/runtime plugin은 제거될 때 보통 직접 unsubscribe하지 않아도 된다. Plugin context가 dispose될 때 cleanup이 실행된다.

더 일찍 중단하고 싶으면 반환된 unsubscribe를 보관한다.

```js
const off = ctx.events.on("modal:close", closeModal, { scope: "plugin" });

button.onclick = () => {
    off();
};
```

Runtime plugin에서는 `activate`에서 unsubscribe를 return해도 된다.

```js
/** @type {import("../../../sdk/repair2-plugin-sdk").RepairRuntimePlugin} */
export default {
    id: "example.runtime",
    activate({ ctx }) {
        return ctx.components.subscribe((components) => {
            ctx.logger.info("components", components.length);
        });
    }
};
```

Disposal은 HMR replacement, component removal, runtime plugin deactivation, project data replacement, play window unload 때 실행된다. Cleanup error는 report되며 다른 cleanup을 막으면 안 된다.

## Logging And Error Reporting

Developer-visible plugin log에는 `ctx.logger`를 사용한다.

```js
ctx.logger.info("mounted");
ctx.logger.warn("missing optional resource");
ctx.logger.error("failed to initialize");
```

이 log는 editor에 표시된다. Warning/error log는 dialog를 열 수도 있다. High-frequency event에는 warning을 사용하지 않는다.

Missing component/resource 같은 expected runtime condition에서는 `throw`를 피한다. Report하고 안전하게 return한다.

```js
const component = ctx.components.get("WindowA");
if (!component) {
    ctx.logger.warn("WindowA does not exist yet.");
    return;
}
```

## Events And Side Effects

`ctx.events.emit/on`은 기본적으로 `scope: "repair"`를 사용한다.

Repair event는 project event entry를 activate할 수 있으므로 강력하지만 side effect다. Project flow를 의도할 때만 default scope를 사용한다.

```js
ctx.events.emit("door-opened", { id: "A" });
```

Project event entry를 실행하면 안 되는 plugin-to-plugin broadcast에는 `scope: "plugin"`을 사용한다.

```js
ctx.events.emit("taskbar:toggle", "WindowA", { scope: "plugin" });
ctx.events.on("taskbar:toggle", (event) => {
    ctx.components.setVisible(event.data, true);
}, { scope: "plugin" });
```

같은 plugin instance 안에만 머물러야 하는 event에는 `scope: "local"`을 사용한다.

```js
ctx.events.on("refresh", refresh, { scope: "local" });
ctx.events.emit("refresh", null, { scope: "local" });
```

Listener exception은 catch되어 plugin log로 report된다.

## Components

Component는 project action이 만든 existing runtime object다. `ctx.components`는 이를 관찰하고 제어하게 해주지만 component를 생성하지는 않는다.

```js
const handle = ctx.components.get("WindowA");
```

Component lookup은 plugin-facing id를 받는다. Alias가 있으면 alias를 사용한다. Handle에는 diagnostics를 위한 `realId`도 포함된다.

Handle은 snapshot이다. 한 번의 판단에는 유용하지만 항상 최신 state라고 취급하면 안 된다. 지속적인 UI에는 subscribe한다.

```js
const off = ctx.components.subscribe((components) => {
    renderTaskbar(components);
});
```

Visibility는 existence가 아니다. Invisible component도 runtime component이며 project가 visibility를 빠르게 toggle할 수 있다. Invisible이라는 이유만으로 remove하지 않는다.

Control method는 live play runtime에 side effect를 만든다.

```js
ctx.components.setVisible("WindowA", false);
ctx.components.setZIndex("WindowA", 20);
ctx.components.setStyle("WindowA", "left: 40px; top: 20px;");
ctx.components.remove("WindowA");
ctx.components.clear();
```

`remove`와 `clear`는 기존 runtime removal behavior를 호출하며 transition/disposal path를 trigger할 수 있다.

## Variables

Variable은 project variable name으로 접근한다.

```js
const score = ctx.variables.get("score");
ctx.variables.set("score", Number(score ?? 0) + 1);
```

Variable을 set하면 runtime state가 바뀌고 기존 variable subscriber/monitoring에 알린다. Saved project default를 변경하지는 않는다.

지속적인 update가 필요하면 subscribe한다.

```js
ctx.variables.subscribe("score", (value) => {
    renderScore(value);
});
```

Missing variable은 plugin log로 report하고 safe value를 반환한다.

## Resources And Preloads

Resource는 title-based다.

```js
const resource = ctx.resources.get("portrait.png");
const img = ctx.resources.createElement("portrait.png");
```

`createElement`는 지원되는 image/video resource의 runtime DOM을 만든다. Unsupported resource는 `null`을 반환한다.

Preload method는 runtime preload state에 영향을 준다.

```js
ctx.resources.addPreload("intro.mp4");
const ready = ctx.resources.isPreloaded("intro.mp4");
ctx.resources.removePreload("intro.mp4");
```

Preload state는 runtime-only다. Project data에 저장되지 않는다. Preload element는 resource runtime에서 이후 consume될 수 있으므로 add/remove가 이후 media creation에 영향을 줄 수 있다.

Resource import와 asset copying은 editor/main responsibility이며 plugin context responsibility가 아니다.

## App

`ctx.app`은 direct internal access 없이 runtime app information을 제공한다.

```js
const config = ctx.app.getConfig();
const [scaleX, scaleY] = ctx.app.getSizeRatio();
const screen = ctx.app.getScreenSize();
```

`ctx.app.devMode`는 현재 runtime config를 반영한다.

`getConfig()`는 runtime config에서 복사한 plain data를 반환한다. Snapshot으로 취급한다.

`ctx.app.internal.getAppData()`는 mutable internal `AppData` object를 반환한다. Stable context API로 표현할 수 없는 작업에만 escape hatch로 사용한다.

## Communication

`ctx.communication`은 기존 socket/serial send behavior를 감싼다.

```js
ctx.communication.socketSend("status", { ready: true });
ctx.communication.serialSend("payload");
```

Incoming socket/serial data는 계속 기존 communication entry와 repair event를 통해 project로 들어온다. Incoming data를 관찰하려면 `socket` 또는 `serial` repair event를 listen한다.

```js
ctx.events.on("socket", (event) => {
    ctx.logger.info("socket data", event.data);
});
```

Data send는 main-process IPC를 통한다. 그 자체로 plugin-scoped event를 만들지는 않는다.

## Store

`ctx.store`는 기존 main-owned persistent store path를 사용한다.

```js
ctx.store.set("my-plugin.enabled", true);
const enabled = ctx.store.get("my-plugin.enabled");
```

Store key는 app 전체에서 global이다. `your-plugin.setting` 같은 namespaced key를 사용한다.

## Services

다른 plugin에 callable behavior를 제공해야 하면 service를 사용한다.

Provider:

```js
return ctx.services.provide("example.counter", {
    count: 0,
    increment() {
        this.count += 1;
        return this.count;
    }
});
```

Consumer:

```js
const counter = ctx.services.tryUse("example.counter");
counter?.increment();
```

`use(name)`은 missing service를 warning으로 report한다. `tryUse(name)`은 조용히 `null`을 반환한다. Optional integration에는 `tryUse`를 선호한다.

Service name은 play runtime 안에서 global이다. `your-plugin.feature` 같은 namespaced name을 사용한다.

## Lifecycle

Context API가 자동 처리하지 않는 cleanup에는 lifecycle을 사용한다.

```js
const interval = setInterval(tick, 1000);
ctx.lifecycle.onDispose(() => clearInterval(interval));
```

DOM listener를 직접 등록했다면 직접 정리한다.

```js
window.addEventListener("resize", resize);
ctx.lifecycle.onDispose(() => window.removeEventListener("resize", resize));
```

해당 plugin instance의 context를 의도적으로 종료하려는 것이 아니라면 일반 plugin code에서 `ctx.lifecycle.dispose()`를 호출하지 않는다.

## Context에 없는 API

Component creation은 `ctx.components`에 포함되어 있지 않다. Component는 계속 기존 project actions/steps를 통해 생성된다. 이렇게 해야 context가 다른 behavior를 가진 두 번째 component runtime이 되지 않는다.

## Practical Checklist

Plugin 배포 전에 확인한다.

- `// @ts-check`를 사용한다.
- Element/frame constructor에서 `ctx`를 optional로 취급한다.
- Plugin-visible message에는 `ctx.logger`를 사용한다.
- Event scope를 의도적으로 선택한다.
- Function/transition plugin에서 long-lived subscription을 피한다.
- Manual timer, DOM listener, external resource를 cleanup한다.
- Component handle을 영구적인 truth로 저장하지 않는다.
- `ctx.app.internal.getAppData()`는 stable context API가 없을 때만 사용한다.
