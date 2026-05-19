# Plugin Authoring Guide

이 문서는 REPAIR v2 plugin 작성 흐름 전체를 설명한다. API reference를 읽기 전에 시작점으로 사용한다.

## 1. Plugin Type 선택

작업에 맞는 가장 작은 plugin type을 선택한다.

- 하나의 component element 안에 DOM이 필요하면 element plugin을 사용한다.
- component 전체를 감싸고 내부 layout surface를 제어해야 하면 frame plugin을 사용한다.
- 여러 components, variables, resources, events, communication, store state, plugin services를 play runtime 전역에서 조율해야 하면 runtime plugin을 사용한다.
- step이나 listener에서 실행되는 short-lived logic은 function plugin을 사용한다.
- animation keyframes나 transition-generation logic은 transition plugin을 사용한다.

Runtime plugin은 강력하다는 이유만으로 선택하지 않는다. Runtime plugin은 taskbar, inspector, global controller, window manager, plugin-to-plugin coordination처럼 cross-cutting behavior에 적합하다.

## 2. Source Plugin과 Runtime Plugin 구분

`project/plugins/svelte-plugins/{name}` 아래의 Svelte plugin project는 source workspace다. Build 후에는 `project/plugins/elements` 또는 `project/plugins/frames` 아래의 일반 runtime plugin file이 된다.

Runtime은 Svelte source project를 별도 plugin type으로 취급하지 않는다. Built output은 계속 element/frame plugin contract를 따라야 한다.

## 3. SDK Type 사용

설치된 REPAIR는 SDK를 app data 아래에 둔다.

```text
%APPDATA%/repair2/sdk/repair2-plugin-sdk
```

Runtime plugin file은 아래에 있다.

```text
%APPDATA%/repair2/project/plugins/{pluginType}
```

Vanilla JS plugin은 single runtime file이다. SDK runtime helper를 import하지 말고 JSDoc type import를 사용한다.

`project/plugins/elements/my-plugin.js`에 있는 vanilla element plugin 예:

```js
// @ts-check
/** @typedef {import("../../../sdk/repair2-plugin-sdk").RepairElementPluginOptions} RepairElementPluginOptions */

export default class MyPlugin extends HTMLElement {
    /**
     * @param {RepairElementPluginOptions} options
     */
    constructor({ attributes = {}, ctx = null } = {}) {
        super();
        this.ctx = ctx;
        this.textContent = ctx ? `${ctx.plugin.id} mounted` : "mounted";
    }
}
```

Runtime/function/transition plugin file에서는 plugin type에 맞는 exported type을 `@type`으로 사용한다.

Svelte plugin source project는 build step이 있고 `npm install`을 사용할 수 있다. 새 Svelte plugin project에는 다음 dependency가 들어간다.

```json
{
    "devDependencies": {
        "@fainthit/repair2-plugin-sdk": "file:../../../../sdk/repair2-plugin-sdk"
    }
}
```

Svelte plugin source code에서는 JSDoc type import와 일반 SDK helper import를 모두 사용할 수 있다.

## 4. Plugin 정의

Vanilla JS plugin은 helper import 대신 `@type`을 사용한다.

```js
// @ts-check
/** @typedef {import("../../../sdk/repair2-plugin-sdk").RepairRuntimePlugin} RepairRuntimePlugin */

/** @type {RepairRuntimePlugin} */
export default {
    activate({ ctx }) {
        return ctx.components.subscribe((components) => {
            ctx.logger.info("components", components.length);
        });
    }
};
```

Svelte plugin source project는 package가 설치되어 있으면 SDK helper를 사용할 수 있다.

```js
import { defineElementPlugin } from "@fainthit/repair2-plugin-sdk";

export default defineElementPlugin(MyElement);
```

Helper는 type information을 유지하고 가벼운 development-time validation을 수행한다. Helper가 plugin을 global register하지는 않는다. REPAIR는 여전히 project plugin directory에서 built plugin을 발견한다.

## 5. Context 받기

Element와 frame plugin constructor는 `ctx`를 optional로 취급한다.

```js
constructor({ attributes = {}, modules = null, ctx = null } = {}) {
    super();
    this.ctx = ctx;
}
```

이렇게 해야 context를 전달하지 않는 오래된 runtime path와도 호환된다.

Runtime plugin은 `activate({ attributes, modules, ctx })` 형태의 call argument object를 받는다. Function과 transition plugin도 call argument로 context를 받을 수 있다.

```js
/** @type {import("../../../sdk/repair2-plugin-sdk").RepairFunctionPlugin} */
export default {
    function({ attributes, ctx, signal }) {
        if (signal?.aborted) return false;
        ctx?.logger.info("function plugin executed", attributes);
        return true;
    }
};
```

Function과 transition plugin은 short-lived다. Long-lived subscription은 return 전에 dispose할 수 있는 경우가 아니라면 피한다.

## 6. Console 대신 Logger 사용

Plugin feedback에는 다음을 사용한다.

```js
ctx.logger.info("message");
ctx.logger.warn("message");
ctx.logger.error("message");
```

이 message는 plugin log path를 통해 editor에 표시된다. Warning과 error log는 dialog를 열 수도 있으므로 자주 발생하는 status update에는 사용하지 않는다.

`console.*`은 임시 local debugging에만 사용한다.

## 7. Event Scope 명시

`ctx.events.emit/on`은 기본적으로 repair project event scope를 사용한다. 이 동작은 project event entry를 activate할 수 있다.

Project flow를 의도할 때만 기본 scope를 사용한다.

```js
ctx.events.emit("door-opened", { id: "A" });
```

Plugin coordination 전용 event에는 `scope: "plugin"` 또는 `scope: "local"`을 사용한다.

Scope 선택은 단순 옵션이 아니라 설계 결정이다.

## 8. App, Communication, Store API 사용

`ctx.app`은 read-oriented runtime information을 제공한다.

```js
ctx.app.devMode;
ctx.app.getConfig();
ctx.app.getSizeRatio();
ctx.app.getScreenSize();
```

`ctx.app.internal.getAppData()`는 mutable internal app data object를 반환한다. Stable public contract가 아니라 escape hatch로 취급한다.

`ctx.communication`은 `RepairUtils.communication`과 같은 send behavior를 감싼다.

```js
ctx.communication.socketSend("channel", "payload");
ctx.communication.serialSend("payload");
```

`ctx.store`는 기존 main-owned persistent store IPC를 사용한다.

```js
ctx.store.set("my-plugin.enabled", true);
const enabled = ctx.store.get("my-plugin.enabled");
```

Store key는 충돌을 피하기 위해 namespaced key를 사용한다.

## 9. Long-Lived Work 관리

일부 context API는 cleanup을 자동 등록한다.

- `ctx.events.on`
- `ctx.components.subscribe`
- `ctx.variables.subscribe`
- `ctx.services.provide`

Manual timer, DOM listener, observer, external resource는 직접 cleanup해야 한다.

```js
const interval = setInterval(tick, 1000);
ctx.lifecycle.onDispose(() => clearInterval(interval));
```

해당 plugin instance의 context를 의도적으로 종료하려는 것이 아니라면 `ctx.lifecycle.dispose()`를 호출하지 않는다.

## 10. Handle은 Runtime Snapshot

Component와 resource handle은 현재 runtime state를 설명한다. 판단과 rendering에는 유용하지만 permanent truth로 취급하면 안 된다.

Ongoing UI에는 component 또는 variable change를 subscribe한다. One-time operation에서는 실행 직전에 handle을 다시 읽는다.

## 11. Runtime Side Effect는 의도적으로 사용

다음 call은 live runtime state를 변경한다.

- `ctx.components.setVisible`
- `ctx.components.setZIndex`
- `ctx.components.setStyle`
- `ctx.components.modify`
- `ctx.components.remove`
- `ctx.components.clear`
- `ctx.variables.set`
- `ctx.resources.addPreload`
- `ctx.resources.removePreload`
- repair scope의 `ctx.events.emit`
- `ctx.communication.socketSend`
- `ctx.communication.serialSend`
- `ctx.store.set`

이 동작을 의도적으로 사용하고, behavior가 명확하지 않다면 plugin 안에 assumption을 남긴다.

## 12. Compatibility 유지

Plugin 배포 전에 확인한다.

- 가능한 곳에서는 `ctx`를 optional로 취급한다.
- Plugin kind에 맞는 type-specific SDK type을 사용한다.
- Function/transition plugin에서 long-lived subscription을 피한다.
- Undocumented internal field에 의존하지 않는다.
- Stable context API로 표현할 수 없을 때만 `ctx.app.internal.getAppData()`를 사용한다.
- Invisible component가 deleted 상태라고 가정하지 않는다.
- Hide 대신 `remove`나 `clear`를 사용하지 않는다.
- Expected runtime condition에서는 throw보다 `ctx.logger`로 visible하게 보고한다.

## 13. 다음 문서

- `context-api.md`: context API behavior와 side effect 상세.
- `plugin-types.md`: plugin type별 lifecycle과 intended usage.
- `compatibility-and-pitfalls.md`: 흔한 실수와 compatibility notes.
