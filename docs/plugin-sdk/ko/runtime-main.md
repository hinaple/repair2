# Runtime main

Runtime plugin은 `manifest.json`의 `main` 필드로 main-process entry를 추가할 수 있습니다. 이렇게 하면 하나의 runtime plugin이 두 side를 가집니다.

- play renderer에서 로드되는 renderer entry
- Electron main process에서 로드되는 main entry

플러그인 타입은 여전히 `runtime`입니다.

Main entry는 Electron main process에서 실행되며 trusted code로 취급해야 합니다. Renderer context API로 필요한 동작을 표현할 수 없을 때만 main entry를 사용하세요.

## 매니페스트

```json
{
    "name": "bridge-plugin",
    "type": "runtime",
    "entry": "src/renderer/index.js",
    "outDir": "dist/renderer",
    "main": {
        "entry": "src/main/index.js",
        "outDir": "dist/main"
    }
}
```

위의 명시적 경로는 `main`이 있을 때 사용되는 기본값과 일치합니다.

## Renderer entry

Renderer entry는 `RuntimeExport`를 export합니다.

```ts
import type { RuntimeExport } from "@fainthit/repair2-plugin-sdk";
import type { Attr, Main, Renderer } from "./plugin-types";

const plugin: RuntimeExport<Attr, Main, Renderer> = {
    async activate({ ctx, main }) {
        const value = await main?.readValue();
        ctx.logger.info(value);
    },
    renderer: {
        notify(message) {
            console.log(message);
        }
    }
};

export default plugin;
```

플러그인에 active main entry가 없으면 `main`은 `null`입니다. 플러그인이 main-side 동작을 필요로 한다면 매니페스트와 타입 정의를 함께 유지하세요.

## Main entry

Main entry는 `RuntimeMainExport`를 export합니다.

```ts
import type { RuntimeMainExport } from "@fainthit/repair2-plugin-sdk";
import type { Attr, Main, Renderer } from "./plugin-types";

const main: RuntimeMainExport<Attr, Main, Renderer> = {
    activate({ renderer }) {
        renderer.notify("main activated");
    },
    main: {
        readValue() {
            return "value from main";
        }
    }
};

export default main;
```

Main context는 의도적으로 작습니다. 현재는 lifecycle cleanup을 제공합니다. Main entry cleanup은 `ctx.lifecycle.onDispose` 또는 `activate()`에서 반환한 disposer를 사용해야 합니다.

## 공유 method map

공유 method map 타입을 정의하고 양쪽에서 import하세요.

```ts
export type Attr = {
    label: string;
};

export type Main = {
    readValue(): string;
};

export type Renderer = {
    notify(message: string): void;
};
```

이 타입이 두 파일 모두에서 completion을 제공합니다. TypeScript는 한 default export를 검사해서 다른 파일에 자동으로 연결하지 않습니다.

## 호출 방향

Renderer code는 `main`을 통해 main method를 호출합니다.

```ts
const value = await main?.readValue();
```

Renderer-to-main 호출은 IPC를 건너며 항상 promise를 반환합니다. 이 호출은 현재 renderer activation과 짝지어진 main instance를 대상으로 합니다.

Main code는 `renderer`를 통해 renderer method를 호출합니다.

```ts
renderer.notify("ready");
```

Main-to-renderer 호출은 fire-and-forget입니다. Main은 renderer 반환값을 관찰하거나 renderer 완료를 await할 수 없습니다. Renderer method는 command 또는 notification으로 설계하세요.

Main code에 결과가 필요하다면 renderer-to-main request path를 설계하고 renderer가 결과와 함께 main method를 호출하게 하세요.

Renderer method 목록은 activation 중 `renderer` 객체에서 캡처됩니다. Renderer method는 activation 전에 정의하고 bridge method 객체를 안정적으로 유지하세요.

## Activation order

각 renderer activation request마다 REPAIR2는 해당 플러그인의 새 main runtime instance를 만들고 이전 instance를 dispose합니다. Main `activate()`는 renderer `activate()`가 끝나기 전에 실행됩니다.

Main `activate()`가 renderer method를 호출하면, REPAIR2는 renderer `activate()`가 완료될 때까지 호출을 큐에 넣습니다. Renderer method는 여전히 idempotent command여야 하며 delivery 전에 dispose될 수 있음을 견뎌야 합니다.

Main runtime instance는 renderer runtime lifecycle을 따릅니다. Renderer runtime instance가 교체되거나 dispose되면 짝지어진 main instance도 dispose됩니다.

HMR 중 main-side rebuild가 발생하면 REPAIR2는 main entry를 다시 로드하고 renderer runtime side도 함께 교체합니다. Renderer-side rebuild만 발생하면 기존 main module을 반드시 다시 import하지는 않지만, renderer runtime이 다시 activate되므로 main instance도 다시 생성됩니다.

Renderer entry는 lifetime 동안 두 번 이상 activate될 수도 있습니다. 이후의 renderer `activate()` 호출이 REPAIR2가 renderer module을 다시 import했거나 renderer factory를 다시 호출했다는 뜻은 아닙니다. Factory는 main activation 전에 실행될 수 있으며 main/renderer coordination에 사용해서는 안 됩니다. Activation lifetime을 module-level mutable variable로 모델링하지 마세요. Activation state는 activated object 내부, `activate()` 내부, 또는 `ctx.store` 같은 runtime-owned storage에 보관하세요.

## Factories

양쪽 모두 factory를 export할 수 있습니다. Renderer runtime factory는 async일 수 있습니다. Runtime main factory는 main export object를 동기적으로 반환해야 합니다.

```ts
import type { RuntimeExport } from "@fainthit/repair2-plugin-sdk";

const plugin: RuntimeExport = () => ({
    activate({ ctx }) {
        ctx.logger.info("renderer activated");
    }
});

export default plugin;
```

```ts
import type { RuntimeMainExport } from "@fainthit/repair2-plugin-sdk";

const main: RuntimeMainExport = () => ({
    activate({ ctx }) {
        ctx.lifecycle.onDispose(() => {});
    }
});

export default main;
```
