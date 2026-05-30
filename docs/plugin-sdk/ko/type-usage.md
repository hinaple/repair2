# 타입 사용법

SDK는 타입이 기준이 되도록 설계되어 있습니다. 문서는 일반적인 형태와 중요한 규칙을 보여줍니다. 에디터는 `ctx`, `attributes`, `main`, `renderer`에서 사용할 수 있는 정확한 필드를 보여줘야 합니다.

## JSDoc을 사용하는 JavaScript

JSDoc type import를 사용하면 코드 옆에서 플러그인 형태를 확인할 수 있습니다.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport<{ message: string }>} */
export default function run({ attributes, ctx }) {
    ctx.logger.info(attributes.message);
}
```

이 방식은 런타임 파일을 plain JavaScript로 유지하면서 기대되는 export shape를 문서화합니다.

긴 generic type은 먼저 local typedef를 정의하세요.

```js
/** @typedef {{ message: string }} Attr */
/** @typedef {import("@fainthit/repair2-plugin-sdk").FunctionExport<Attr, boolean>} Plugin */

/** @type {Plugin} */
export default function check({ attributes }) {
    return !!attributes.message;
}
```

## TypeScript

TypeScript에서는 타입을 직접 import하세요.

```ts
import type { RuntimeExport } from "@fainthit/repair2-plugin-sdk";

type Attr = {
    title: string;
};

const plugin: RuntimeExport<Attr> = {
    activate({ attributes, ctx }) {
        ctx.logger.info(attributes.title);
    }
};

export default plugin;
```

## Attribute payloads

`Attributes`는 런타임에서 플러그인에 전달되는 payload 객체를 의미합니다. 매니페스트의 `attributes` declaration list가 아닙니다.

```ts
type Attr = {
    label: string;
    count: number;
};
```

각 플러그인 또는 각 call shape마다 작은 local `Attr` 타입을 사용하세요.

## Runtime steps

Runtime step method는 runtime plugin 객체의 일반 method입니다. Method name은 플러그인 매니페스트에 선언된 step과 일치해야 합니다.

Step method type checking이 필요하면 `RuntimeStep`을 사용하세요.

```ts
import type { RuntimeExport, RuntimeStep } from "@fainthit/repair2-plugin-sdk";

type Attr = {
    label: string;
};

type Steps = {
    showLabel: RuntimeStep<Attr, boolean>;
};

const plugin: RuntimeExport<Attr, {}, {}, Steps> = {
    activate() {},
    showLabel({ attributes, ctx }) {
        ctx.logger.info(attributes.label);
        return true;
    }
};

export default plugin;
```

다시 말해, 매니페스트는 앱이 호출할 수 있는 것을 선언하고, 타입은 그 method가 무엇을 받는지 에디터에 알려줍니다.

## Runtime main bridge

Main entry가 있는 runtime plugin은 공유 method map type을 정의하고 양쪽에서 사용하세요.

```ts
// src/plugin-types.ts
export type Attr = {
    str: string;
};

export type Main = {
    foo(str: string): number;
};

export type Renderer = {
    bar(value: number): void;
};
```

Renderer entry:

```ts
import type { RuntimeExport } from "@fainthit/repair2-plugin-sdk";
import type { Attr, Main, Renderer } from "../plugin-types";

const plugin: RuntimeExport<Attr, Main, Renderer> = {
    async activate({ main }) {
        const value = await main?.foo("hello");
    },
    renderer: {
        bar(value) {
            console.log(value);
        }
    }
};

export default plugin;
```

Main entry:

```ts
import type { RuntimeMainExport } from "@fainthit/repair2-plugin-sdk";
import type { Attr, Main, Renderer } from "../plugin-types";

const main: RuntimeMainExport<Attr, Main, Renderer> = {
    activate({ renderer }) {
        renderer.bar(123);
    },
    main: {
        foo(str) {
            return str.length;
        }
    }
};

export default main;
```

두 파일은 TypeScript에 의해 자동으로 연결되지 않습니다. 공유 method map이 양쪽에 completion을 제공합니다.

Renderer가 `main`을 호출하면 promise로 타입이 잡힙니다.

```ts
const value = await main?.foo("hello");
```

Main이 `renderer`를 호출하면 `void`로 타입이 잡힙니다.

```ts
renderer.bar(123);
```

이는 현재 runtime bridge 동작과 일치합니다.

전체 bridge 동작은 [Runtime main](./runtime-main.md)을 참고하세요.

## Factory exports

Runtime 및 runtime main entry는 객체 또는 객체를 반환하는 factory를 export할 수 있습니다.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").RuntimeExport} */
export default () => ({
    activate({ ctx }) {
        ctx.logger.info("activated");
    }
});
```

Function 및 transition plugin factory는 지원하지 않습니다. Function plugin은 bare function을 export해야 합니다.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport} */
export default function run({ ctx }) {
    ctx.logger.info("called");
}
```

호환성을 위해 REPAIR2는 `function` property가 있는 객체도 계속 허용하지만, 새 플러그인에서는 deprecated 형태입니다.

Transition plugin은 keyframes를 직접 export하거나, keyframes를 반환하는 function을 export해야 합니다.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").TransitionExport} */
export default [{ opacity: 0 }, { opacity: 1 }];
```

```js
/** @type {import("@fainthit/repair2-plugin-sdk").TransitionExport} */
export function fade({ component }) {
    return [{ opacity: 0 }, { opacity: 1 }];
}
```

Runtime main entry도 factory일 수 있습니다.

```ts
import type { RuntimeMainExport } from "@fainthit/repair2-plugin-sdk";

const main: RuntimeMainExport = () => ({
    activate({ ctx }) {
        ctx.lifecycle.onDispose(() => {});
    }
});

export default main;
```

Element 및 frame plugin은 다릅니다. REPAIR2가 host element를 소유하고 host가 채워져야 할 때 플러그인을 호출하므로 mount function을 export합니다.

Renderer runtime factory는 SDK 타입이 허용하는 곳에서는 async일 수 있습니다. Runtime main factory는 main export object를 동기적으로 반환해야 합니다.

## 여러 renderer exports

Element, frame, function, transition plugin은 manifest `exports` field를 통해 여러 renderer export를 노출할 수 있습니다. 각 export에 직접 타입을 붙이세요.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport<{ value: string }, boolean>} */
export function isFilled({ attributes }) {
    return !!attributes.value;
}

/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport<{ value: string }>} */
export function logValue({ attributes, ctx }) {
    ctx.logger.info(attributes.value);
}
```

TypeScript에서는 export-map helper type으로 named export 그룹을 export하기 전에 확인할 수 있습니다.

```ts
import type { FunctionExport, FunctionExports } from "@fainthit/repair2-plugin-sdk";

const functions = {
    isFilled({ attributes }) {
        return !!attributes.value;
    },
    logValue({ attributes, ctx }) {
        ctx.logger.info(attributes.value);
    }
} satisfies FunctionExports<Record<string, FunctionExport<{ value: string }>>>;

export const { isFilled, logValue } = functions;
```

같은 패턴을 `ElementExports`, `FrameExports`, `TransitionExports`로도 사용할 수 있습니다.

## Element 및 frame types

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FrameExport<{ title?: string }>} */
export default function mount({ attributes, ctx }, { target, children, showIntro }) {
    target.dataset.plugin = ctx.plugin.id;
    target.classList.toggle("intro", showIntro);

    const header = document.createElement("header");
    header.textContent = attributes.title ?? "";

    const body = document.createElement("main");
    body.append(children);

    target.append(header, body);

    return () => {
        header.remove();
        body.remove();
    };
}
```

Element plugin에는 `ElementExport`, frame plugin에는 `FrameExport`를 사용하세요. Element mount function은 `{ target, dispatchEvent }`를 받고, frame mount function은 `{ target, children, showIntro }`를 받습니다.

Frame `children`은 runtime-owned `DocumentFragment`입니다. Initial mount 중 append하되 child node를 destroy하거나, 나중에 mutate하기 위해 보관하거나, plugin-owned DOM으로 취급하지 마세요. Cleanup은 frame plugin이 만든 resource만 release해야 합니다.

## Context

Context 객체는 REPAIR2가 주입합니다. 직접 만들면 안 됩니다.

```ts
import type { PluginContext } from "@fainthit/repair2-plugin-sdk";

function logPlugin(ctx: PluginContext) {
    ctx.logger.info(ctx.plugin.id);
}
```

Stable context API를 선호하세요. `ctx.app.internal.getAppData()`는 escape hatch로 사용할 수 있지만, internal mutable app data를 노출하며 안정적인 public contract가 아닙니다.

어떤 plugin context든 받을 수 있는 helper에는 `PluginContext`를 사용하세요. Helper가 특정 플러그인 타입에 묶여 있다면 `RuntimeContext`, `ElementContext`, `FrameContext`, `FunctionContext`, `TransitionContext`를 사용하세요.

Context API 가이드는 [Context](./context.md)를 참고하세요.
