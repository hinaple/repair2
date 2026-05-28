# 호환성과 주의할 점

플러그인을 작성할 때 놓치기 가장 쉬운 규칙들입니다.

## SDK는 type-only입니다

SDK는 타입에 사용하세요. REPAIR2가 런타임 동작을 제공합니다.

SDK runtime import를 중심으로 플러그인을 설계하지 마세요. 실행 시 사용하는 runtime object는 주입된 `ctx`입니다.

## 매니페스트 파일은 JSON입니다

앱은 `manifest.json`을 읽고 JSON으로 파싱합니다. JavaScript 또는 TypeScript 매니페스트 파일은 현재 런타임에 포함되지 않습니다.

에디터 지원을 위해 JSON schema를 사용하세요.

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-plugin",
    "type": "runtime"
}
```

스키마는 에디터 지원을 위한 공개 매니페스트 형태를 설명합니다. 현재 런타임 로딩은 전체 스키마를 검증하지 않습니다. REPAIR2가 여전히 manifest loading, normalization, build path, runtime plugin registration을 소유합니다.

매니페스트 필드와 기본값은 [매니페스트](./manifest.md)를 참고하세요.

## Plugin name은 전역입니다

REPAIR2는 directory name이 아니라 manifest `name`으로 플러그인을 식별합니다. Name은 모든 plugin type을 통틀어 unique해야 합니다.

여러 plugin manifest가 같은 name을 사용하면 REPAIR2는 warning을 보고하며, 어느 쪽이 사용될지 보장하지 않습니다. Duplicate plugin name은 서로 다른 type의 plugin 사이에서 발생하더라도 project error로 취급하세요.

## `main`이 있는 `runtime`도 여전히 `runtime`입니다

매니페스트 타입은 여전히 `runtime`입니다. `main` property는 main-process entry를 추가합니다.

Runtime plugin의 매니페스트에 `main`이 없으면 renderer `activate()`는 `main: null`을 받습니다.

## Object exports, factory exports, mount functions

Runtime, function, transition, runtime main entry는 object export 또는 factory export일 수 있습니다.

```js
export default {
    activate() {}
};
```

```js
export default () => ({
    activate() {}
});
```

Element 및 frame plugin은 mount function export만 지원합니다. REPAIR2는 플러그인이 runtime-owned host element 안에 렌더링되어야 할 때 default export를 호출합니다.

```js
export default function mount({ attributes, ctx }, options) {
    // ...
}
```

Element mount function은 두 번째 인자로 `{ target, dispatchEvent }`를 받습니다. Frame mount function은 `{ target, children, showIntro }`를 받습니다.

Renderer runtime, function, transition factory는 SDK 타입이 허용하는 곳에서는 async일 수 있습니다. Runtime main factory는 객체를 동기적으로 반환해야 합니다.

## Renderer activation은 module construction이 아닙니다

Renderer `activate()`는 runtime lifecycle event입니다. REPAIR2가 module을 다시 import했거나 renderer factory를 다시 호출했다는 보장이 아닙니다.

Renderer runtime은 특정 instance creation 시점을 약속하지 않습니다. Plugin lifetime state에 module-level mutable variable을 사용하지 마세요. Activation-local state, exported object instance에 저장된 state, 또는 `ctx.store` 같은 runtime-owned storage를 선호하세요.

Runtime plugin은 runtime plugin config 변경, project data의 runtime plugin reset, HMR reload 시 deactivate되고 다시 activate될 수 있습니다. Runtime plugin payload 비교는 shallow하므로 runtime plugin이 restart되기를 기대한다면 payload object를 immutable하게 업데이트하세요.

REPAIR2는 rebuild, import, HMR update가 실패해도 이미 실행 중인 plugin을 가능한 한 유지하려고 합니다. 실패한 update 이후에도 play renderer가 계속 실행될 수 있도록 이전 imported plugin instance가 사용될 수 있습니다. Production-style play에서는 plugin runtime error가 dialog로 사용자를 방해하지 않을 수 있으므로, 예상 가능한 실패는 `ctx.logger`로 보고하세요.

Project-level loading, linked plugin, HMR 세부사항은 [로드와 HMR](./loading-and-hmr.md)을 참고하세요.

## Function plugin은 객체입니다

현재 function plugin contract는 `function` property가 있는 객체입니다.

```js
export default {
    function() {}
};
```

Bare function을 plugin 자체로 export하지 마세요.

## Transition plugin은 객체입니다

Transition plugin은 `keyframes` 또는 `function`이 있는 객체를 export합니다.

```js
export default {
    keyframes: [{ opacity: 0 }, { opacity: 1 }]
};
```

Direct keyframe array export는 현재 contract에 포함되지 않습니다.

현재 런타임은 `keyframes` 또는 transition `function` 결과가 keyframe array를 반환하는 function인 경우도 허용합니다. 지연된 keyframe creation이 유용하지 않다면 array를 직접 반환하는 것을 선호하세요.

## Runtime step 이름은 매니페스트와 일치해야 합니다

Runtime step method는 이름으로 조회됩니다. 매니페스트가 `open`이라는 step을 선언하면 runtime plugin은 `open` method를 정의해야 합니다.

```json
{
    "name": "window-tools",
    "type": "runtime",
    "steps": {
        "open": ["target"]
    }
}
```

```js
export default {
    open({ attributes }) {
        // ...
    }
};
```

Method가 없으면 REPAIR2는 호출하는 대신 plugin issue를 보고합니다.

Step declaration value는 editor attribute input name을 설명합니다. Method argument도 아니고, payload schema도 아니며, runtime validation도 아닙니다.

Runtime step call은 renderer activation이 준비된 뒤에만 실행됩니다. Runtime step을 plugin initialization hook으로 사용하지 마세요.

## Renderer to main은 promise를 반환합니다

Renderer runtime code가 `main.foo()`를 호출하면 IPC를 건넙니다. Main method가 plain value를 반환하더라도 항상 promise를 반환합니다.

```js
export default {
    async activate({ main }) {
        const result = await main?.foo("value");
    }
};
```

`main`은 `null`일 수 있으므로 확인하거나, 플러그인이 manifest `main` entry를 요구하도록 설계하세요.

## Main to renderer는 fire-and-forget입니다

Main entry code가 `renderer.bar()`를 호출하면 현재 런타임은 호출을 renderer로 보내고 renderer result를 반환하지 않습니다.

Renderer method는 request/response function이 아니라 command 또는 notification으로 설계하세요.

Main code에 결과가 필요하다면 main-side state에 저장하거나 별도의 renderer-to-main request path를 설계하세요.

## Main activation에서 renderer 호출은 지연될 수 있습니다

각 renderer activation request는 해당 플러그인의 새 main runtime instance를 만들고 이전 instance를 dispose합니다. Main `activate()`는 renderer `activate()`가 끝나기 전에 실행됩니다. Main `activate()`가 renderer method를 호출하면, REPAIR2는 renderer runtime이 준비될 때까지 호출을 큐에 넣습니다.

즉 renderer method는 main activation 중 즉시 실행된다고 가정하면 안 됩니다. Initialization order를 단순하게 유지하고, renderer method는 delivery 전에 dispose될 수 있음을 견디는 idempotent command로 작성하세요.

## Lifecycle cleanup을 사용하세요

Runtime, element, frame plugin은 subscription 또는 external resource를 오래 유지하는 경우가 많습니다. Cleanup을 `ctx.lifecycle.onDispose`에 등록하세요.

```js
const interval = setInterval(tick, 1000);
ctx.lifecycle.onDispose(() => clearInterval(interval));
```

Function 및 transition plugin은 보통 짧게 실행됩니다. 명시적으로 cleanup하지 않는 한 오래 유지되는 subscription은 피하세요.

Plugin에 persistent state 또는 long-lived coordination이 필요하다면 runtime, element, frame plugin을 선호하세요. Function 및 transition plugin은 보통 작업을 끝낸 뒤 빠르게 resource를 해제해야 합니다.

Element 및 frame plugin은 HMR 중 replacement됩니다. 이전 mount cleanup과 context disposal은 replacement mount 전에 실행됩니다. Mount function은 cleanup function을 반환할 수도 있습니다. REPAIR2는 plugin unmount 중 이 함수를 호출합니다.

Element plugin에서 REPAIR2는 플러그인을 mount하기 전에 host `target`을 비웁니다. 이전 mount의 DOM children이 여전히 존재한다고 의존하지 마세요.

Frame plugin에서 `children`은 runtime-owned component element node를 포함합니다. 올바른 초기 위치에 append하되 child node에 side effect를 만들지 마세요. Destroy하거나, 나중에 mutate하기 위해 저장하거나, plugin-owned DOM으로 취급하지 마세요.

Frame replacement 중에는 이전 frame cleanup이 새 frame mount가 현재 `children` fragment를 배치하기 전에 실행됩니다. Frame cleanup은 현재 child element placement를 query하는 방식이 아니라, 해당 frame plugin이 만든 listener, resource, DOM에 대한 직접 참조를 사용해야 합니다.

Renderer runtime plugin은 `activate()`에서 disposer를 반환하거나 `dispose` property를 제공할 수도 있습니다. Runtime main entry는 `ctx.lifecycle.onDispose` 또는 `activate()`에서 반환한 disposer를 사용해야 합니다.

## Component handle은 live handle입니다

Component handle은 현재 runtime state를 읽는 getter를 가진 stable frozen object입니다. 나중에 같은 runtime component를 조작하려면 handle을 보관하세요.

Getter return value가 object인 경우 snapshot입니다. 예를 들어 `handle.position.x.distance`를 mutate해도 component는 움직이지 않습니다. Runtime change에는 `setPosition()` 또는 `setPositionBy()` 같은 handle method를 사용하세요.

`ctx.components.subscribe()`는 component creation, removal, replacement를 관찰합니다. Live handle이 visibility, style, z-index, position을 변경할 때는 실행되지 않습니다.

`handle.node`는 live component DOM node를 노출합니다. Handle method로 표현할 수 없을 때만 사용하세요. Direct DOM mutation은 runtime update에 의해 덮어써질 수 있습니다.

Resource handle도 현재 runtime state를 설명합니다. 필요한 작업에 가깝게 읽으세요.

## Event scope가 중요합니다

`ctx.events.emit()`의 기본값은 `repair` scope입니다. 이것은 project event entry를 트리거할 수 있습니다. Plugin-only communication에는 `plugin` 또는 `local` scope를 사용하세요.

```js
ctx.events.emit("changed", data, { scope: "plugin" });
```

## Internal app data는 escape hatch입니다

`ctx.app.internal.getAppData()`는 mutable internal app data를 노출합니다. Stable context API로 동작을 표현할 수 없을 때만 사용하세요.

플러그인이 internal app data shape에 의존한다면 그 의존성을 compatibility-sensitive로 취급하세요.

Stable context API는 [Context](./context.md)를 참고하세요.

## Transition의 side effect

Transition plugin은 보통 keyframe을 반환하고 거기서 끝나야 합니다. Component mutation, project event emission, 긴 timer, subscription은 runtime, element, frame, function plugin으로 처리하는 것이 더 적합합니다.

## Uncaught error보다 plugin log를 선호하세요

예상 가능한 plugin problem과 diagnostic에는 `ctx.logger`를 사용하세요. Programmer error에는 throw가 여전히 유용할 수 있지만, user-visible plugin failure는 가능한 한 plugin log path를 통해 보고해야 합니다.
