# 플러그인 타입

REPAIR2에는 다섯 가지 플러그인 타입이 있습니다.

- `runtime`
- `element`
- `frame`
- `function`
- `transition`

작업에 맞는 가장 작은 타입을 선택하세요. 하나의 element 안에 렌더링만 하면 되는 플러그인은 runtime plugin이 아니어야 합니다. 전체 play runtime을 조정하는 플러그인을 frame 안에 숨기면 안 됩니다.

## Element plugins

하나의 component element 안에 custom DOM이 필요할 때 element plugin을 사용하세요.

Custom control, visual widget, media view, 작은 interactive surface에 유용합니다. Element plugin은 mount function을 export합니다. REPAIR2는 플러그인이 element host 안에 렌더링되어야 할 때 이 함수를 호출합니다.

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

첫 번째 인자는 `attributes`와 주입된 `ElementContext`를 포함합니다. 두 번째 인자는 host `target`과 plugin listener-channel `dispatchEvent`를 포함합니다. `dispatchEvent`는 native DOM method가 아닙니다. Native DOM dispatch가 필요하면 `target.dispatchEvent()`를 사용하세요.

Element plugin은 element lifecycle에 묶입니다. REPAIR2는 플러그인을 mount하기 전에 host `target`을 비웁니다. 오래 유지되는 플러그인 resource는 `ctx.lifecycle.onDispose`에 등록하거나 `mount()`에서 반환한 함수로 정리해야 HMR 및 replacement cleanup이 동작합니다.

Local UI에는 element plugin을 사용하세요. Global controller로 사용하는 것은 피하세요.

Manifest가 여러 `exports`를 선언하는 경우, 각 export는 editor에서 선택할 수 있는 별도의 mount function입니다.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").ElementExport} */
export function compact({ attributes, ctx }, { target }) {
    target.textContent = attributes.label ?? ctx.plugin.id;
}

/** @type {import("@fainthit/repair2-plugin-sdk").ElementExport} */
export function detailed({ attributes, ctx }, { target }) {
    target.textContent = `${attributes.label ?? ctx.plugin.id}: detailed`;
}
```

## Frame plugins

전체 component를 감싸야 할 때 frame plugin을 사용하세요. Component에 frame plugin이 있으면 child element는 frame element 안에 렌더링됩니다.

Component container, window-like chrome, layout shell, component-level visual treatment에 유용합니다.

Frame plugin도 mount function을 export합니다. Component identity와 frame identity를 포함하는 `FrameContext`, 그리고 component element를 담은 `children` document fragment를 받습니다.

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

Frame plugin은 `children`을 올바른 초기 위치에 append해야 합니다. 이 node들은 runtime-owned component element로 취급하세요. 초기 배치 외에는 destroy, 나중에 mutate하기 위한 저장, 또는 다른 side effect를 만들지 마세요.

Component-level layout과 chrome에는 frame plugin을 사용하세요. Element plugin과 마찬가지로 오래 유지되는 작업은 `ctx.lifecycle.onDispose`에 등록하거나 cleanup function을 반환하세요. Cleanup은 frame plugin이 만든 DOM, listener, resource, reference만 release해야 합니다. Project-wide coordination을 frame에 넣지 말고 runtime plugin을 사용하세요.

Frame plugin도 여러 `exports`를 선언할 수 있습니다. 각 export는 별도의 frame mount function입니다.

## 플러그인 DOM에서 resource 렌더링

Play runtime은 `<repair-asset>` custom element를 정의합니다. 이 element를 사용하면 plugin-created DOM 안에서 REPAIR2 image 및 video resource를 빠르게 렌더링할 수 있습니다.

```html
<repair-asset src="logo"></repair-asset>
<repair-asset src="intro-video" volume="0.5" loop></repair-asset>
```

`src`는 runtime resource title로 resource를 선택합니다. `<repair-asset>`은 일치하는 resource를 내부 `<img>` 또는 `<video>` element로 렌더링합니다.

기본적으로 REPAIR2는 preload된 asset이 있으면 그것을 사용합니다. Asset element가 생성된 뒤에는 사용된 preload가 제거되며, 이는 REPAIR2 asset의 일반적인 "creation 후 preload 제거" 동작과 일치합니다.

`clone`은 `<repair-asset>`이 preload를 소비한 뒤에도 preload를 유지해야 할 때 사용합니다. `clone`이 truthy이면 `<repair-asset>`은 현재 preload된 asset을 소비한 다음 같은 resource에 대한 새 preload를 만듭니다.

Preload 소비를 건너뛰려면 `notpreload`를 사용하세요. `notpreload`가 truthy이면 `<repair-asset>`은 preload된 element를 소비하는 대신 새 `<img>` 또는 `<video>` element를 만듭니다.

Boolean-style attribute는 string 기반입니다. Attribute가 존재하고 값이 `"false"`가 아니면 true로 취급됩니다.

```html
<repair-asset src="logo" clone></repair-asset>
<repair-asset src="logo" clone="false"></repair-asset>
<repair-asset src="logo" notpreload></repair-asset>
```

Video resource에서 `volume`은 playback volume을 제어합니다. 기본값은 `1`입니다. `0`은 무음, `1`은 일반 media volume이며, `1`보다 큰 값도 허용됩니다. `volume`이 `1`보다 크면 REPAIR2는 `AudioContext`를 만들고 `GainNode`를 통해 값을 적용합니다.

`loop`는 video resource의 looping을 토글합니다.

```html
<repair-asset src="intro-video" volume="0"></repair-asset>
<repair-asset src="intro-video" volume="1"></repair-asset>
<repair-asset src="intro-video" volume="2" loop></repair-asset>
```

기본적으로 내부 asset은 `width: 100%`와 `height: 100%`를 사용해 `<repair-asset>` 크기에 맞춰 늘어납니다.

Asset이 원래 비율을 유지하면서 한 축을 기준으로 sizing해야 할 때는 `anchor`를 사용하세요.

| `anchor` | Behavior                                                                   |
| -------- | -------------------------------------------------------------------------- |
| unset    | 내부 asset을 `<repair-asset>`의 width와 height 모두에 맞춰 늘립니다.       |
| `width`  | `<repair-asset>`의 width를 사용하고 asset 비율로 height를 자동 계산합니다. |
| `height` | `<repair-asset>`의 height를 사용하고 asset 비율로 width를 자동 계산합니다. |
| `none`   | 원래 asset size를 사용합니다.                                              |

```html
<repair-asset src="logo" style="width: 300px; height: 200px;"></repair-asset>
<repair-asset src="logo" anchor="width" style="width: 300px;"></repair-asset>
<repair-asset src="logo" anchor="height" style="height: 200px;"></repair-asset>
<repair-asset src="logo" anchor="none"></repair-asset>
```

`<repair-asset>`의 기본값은 `object-fit: contain`과 `object-position: center`입니다. 내부 `<img>` 또는 `<video>`는 이 값을 상속하므로 일반 CSS로 fit과 positioning을 조정할 수 있습니다.

## Function plugins

Step, listener 또는 유사한 execution path에서 호출되는 짧은 logic에는 function plugin을 사용하세요.

Function plugin은 function을 export합니다.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport} */
export default function run({ attributes, ctx, signal }) {
    if (signal?.aborted) return false;
    ctx.logger.info("running", attributes);
    return true;
}
```

호환성을 위해 REPAIR2는 `function` property가 있는 객체도 계속 허용하지만, 새 플러그인에서는 deprecated 형태입니다. Function plugin factory는 지원하지 않습니다.

Function은 저장된 plugin pointer payload를 `attributes`로 받고, 주입된 function context를 `ctx`로 받습니다. Step execution 또는 reset cancellation path에서 `signal`을 받을 수도 있습니다. Element listener plugin으로 호출될 때는 설정된 `channel`과 event-like listener payload를 받습니다.

Function plugin은 calculation, check, 작은 async action, listener condition에 사용하세요. 호출이 끝나기 전에 정리하지 않는 한 오래 유지되는 subscription은 피하세요.

Manifest `exports`를 사용하는 경우 각 named export는 별도의 function이어야 합니다.

```js
export function check({ attributes }) {
    return !!attributes.value;
}

export function run({ ctx }) {
    ctx.logger.info("run");
}
```

## Transition plugins

Animation keyframe을 제공하거나 attribute에서 생성하려면 transition plugin을 사용하세요.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").TransitionExport} */
export default [{ opacity: 0 }, { opacity: 1 }];
```

Keyframe을 반환하는 function도 export할 수 있습니다.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").TransitionExport} */
export function slide({ component }) {
    return [{ transform: "translateX(20px)" }, { transform: "translateX(0)" }];
}
```

호환성을 위해 REPAIR2는 `keyframes` property가 있는 객체도 계속 허용하지만, 새 플러그인에서는 deprecated 형태입니다. Transition factory는 지원하지 않으며, transition 객체의 `function` property는 무시됩니다.

Transition plugin은 animation output에 사용하세요. Component mutation, project event, 오래 유지되는 side effect는 피하세요.

## Runtime plugins

Project-wide behavior에는 runtime plugin을 사용하세요. Runtime plugin은 project configuration에서 활성화되며 component, variable, resource, event, communication, store state, plugin service를 관찰하거나 조정할 수 있습니다.

Taskbar, inspector, global window manager, dashboard, cross-plugin service, project-wide event coordination에 유용합니다.

Runtime plugin은 객체 또는 factory를 export할 수 있습니다.

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

`ctx.components.subscribe()`는 creation, removal, replacement 같은 component list 변경에 유용합니다.

Global coordination에는 runtime plugin을 사용하세요. `ctx` API로 표현할 수 있는 동작을 위해 자체 component system을 다시 만들거나 internal app data를 mutate하지 마세요.

Renderer runtime cleanup은 `ctx.lifecycle.onDispose`, `activate()`에서 반환한 disposer, 또는 `dispose` property로 등록할 수 있습니다. Activation-scoped work에는 lifecycle cleanup 또는 `activate()` return value를 선호하세요.

## `main`이 있는 runtime plugin

Runtime plugin은 매니페스트에 `main`을 추가하여 main-process entry도 가질 수 있습니다. `main`이 있어도 여전히 동일한 runtime plugin이며, `main` 옵션을 통해 동작을 main process까지 확장합니다.

Runtime main entry는 Electron main process에서 실행되며 trusted code로 취급해야 합니다. Renderer context API로 필요한 동작을 표현할 수 없을 때만 사용하세요. Renderer runtime code는 main entry가 노출한 method를 호출하기 위한 `main` API를 받습니다. Main entry는 renderer method를 호출하기 위한 `renderer` API를 받습니다.

Renderer to main 호출은 promise를 반환합니다. Main to renderer 호출은 fire-and-forget입니다. Main은 renderer 반환값을 관찰하거나 renderer 완료를 await할 수 없습니다.

플러그인에 main-process behavior가 필요할 때만 `main`을 사용하세요. 모든 작업을 renderer runtime과 `ctx`로 처리할 수 있다면 renderer-only plugin으로 유지하세요.

Bridge typing과 activation detail은 [Runtime main](./runtime-main.md)을 참고하세요.

## Export shapes

| Type                 | Export shape                              |
| -------------------- | ----------------------------------------- |
| `element`            | 선언된 각 export의 mount function         |
| `frame`              | 선언된 각 export의 mount function         |
| `function`           | 선언된 각 export의 function               |
| `transition`         | export별 keyframes 또는 keyframe function |
| `runtime`            | default export object 또는 factory        |
| runtime `main` entry | object 또는 factory                       |
