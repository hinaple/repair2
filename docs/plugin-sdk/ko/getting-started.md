# 시작하기

이 패키지는 REPAIR2 플러그인의 공개 작성 타입을 포함합니다. 런타임 라이브러리를 제공하지는 않습니다. REPAIR2는 플러그인 디렉터리에서 플러그인을 로드하고, 빌드한 뒤, 실행 시 플러그인 코드에 `ctx` 객체를 전달합니다.

대부분의 경우 에디터에서 SDK 타입을 열어 둔 상태로 플러그인을 작성하고, 이 문서들은 올바른 형태를 고르는 지침으로 사용하면 됩니다.

## SDK 설치

플러그인 프로젝트에 SDK를 설치합니다.

```sh
npm install --save-dev @fainthit/repair2-plugin-sdk
```

플러그인 패키지는 보통 ES module 패키지여야 합니다. 버전 범위는 지원하려는 SDK 버전과 맞아야 합니다.

```json
{
    "name": "my-plugin",
    "type": "module",
    "devDependencies": {
        "@fainthit/repair2-plugin-sdk": "^0.2.2"
    }
}
```

이 패키지는 타입 우선입니다. 타입을 import하는 것이 일반적인 사용 방식입니다.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport} */
export default function hello({ ctx }) {
    ctx.logger.info("hello from a function plugin");
}
```

REPAIR2 에디터에서 만든 플러그인은 이 dependency를 자동으로 포함합니다. 에디터는 새 플러그인의 `node_modules` 디렉터리 아래에 번들된 SDK 사본을 둘 수도 있으므로, 에디터에서 만든 플러그인은 별도 설치 단계 없이 동작할 수 있습니다.

## 플러그인 디렉터리

플러그인은 `manifest.json` 파일과 소스 코드를 가진 디렉터리입니다. 매니페스트는 REPAIR2에 플러그인의 종류와 entry 파일 위치를 알려줍니다.

```text
my-plugin/
  manifest.json
  package.json
  src/
    index.js
```

main-process entry가 있는 runtime plugin은 보통 두 개의 source entry를 가집니다.

```text
my-runtime-plugin/
  manifest.json
  package.json
  src/
    renderer/
      index.js
    main/
      index.js
```

`main`이 있는 `runtime`도 여전히 runtime plugin입니다. 별도의 플러그인 타입이 아닙니다.

## 매니페스트

플러그인 매니페스트는 JSON 파일입니다. 에디터 자동완성과 작성 시점 검증을 위해 schema를 사용하세요.

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-plugin",
    "type": "function"
}
```

현재 앱은 `manifest.json`을 JSON으로 읽고, 런타임 로딩에 필요한 필드만 검증합니다. JavaScript 또는 TypeScript 매니페스트 파일은 런타임 계약에 포함되지 않습니다.

가장 작은 유용한 매니페스트는 다음과 같습니다.

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-element",
    "type": "element"
}
```

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-runtime",
    "type": "runtime",
    "steps": {
        "show": ["message"]
    }
}
```

main-process entry가 있는 runtime plugin은 `main`을 추가합니다.

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-runtime-main",
    "type": "runtime",
    "entry": "src/renderer/index.js",
    "outDir": "dist/renderer",
    "main": {
        "entry": "src/main/index.js",
        "outDir": "dist/main"
    }
}
```

Element 및 frame plugin은 `svelte: true`를 설정할 수 있습니다. 이렇게 하면 REPAIR2가 플러그인 소스를 빌드할 때 Svelte Vite plugin을 추가합니다. 별도의 플러그인 타입을 만드는 것은 아닙니다.

Element, frame, function, transition plugin은 여러 renderer export를 선언할 수 있습니다.

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "button-pack",
    "type": "element",
    "exports": {
        "primary": ["label"],
        "secondary": ["label"]
    }
}
```

`exports`가 있으면 plugin entry는 선언된 이름을 모두 export해야 합니다. Plugin이 default export만 사용한다면 `attributes`가 더 짧은 default-export 형태입니다.

전체 매니페스트 가이드는 [매니페스트](./manifest.md)를 참고하세요.

## 빌드와 로드

REPAIR2가 플러그인의 빌드와 로드 경로를 소유합니다. REPAIR2는 매니페스트를 읽고, 선언된 entry를 Vite로 빌드한 뒤, 빌드된 JavaScript 출력을 import합니다. 개발 모드에서는 플러그인 변경이 hot replacement를 트리거할 수 있습니다.

일반 플러그인의 기본 source entry는 `src/index.js`이고 기본 출력 디렉터리는 `dist`입니다. `main`이 있는 runtime plugin의 기본 renderer entry는 `src/renderer/index.js`, 기본 renderer 출력은 `dist/renderer`, 기본 main entry는 `src/main/index.js`, 기본 main 출력은 `dist/main`입니다.

Source directory는 플러그인을 작성하거나 다시 빌드할 때 필요합니다. 원본 source directory가 없어도 프로젝트에 built output이 있으면 실행할 수 있습니다. 프로젝트 로딩, linked plugin, hot reload의 자세한 동작은 [로드와 HMR](./loading-and-hmr.md)을 참고하세요.

플러그인은 매니페스트 타입에 맞는 형태를 export해야 합니다.

- `runtime`: `RuntimeExport`
- `element`: `ElementExport`
- `frame`: `FrameExport`
- `function`: `FunctionExport`
- `transition`: `TransitionExport`

타입 이름을 기준으로 삼으세요. 문서는 각 형태를 언제 사용하는지 설명하지만, 정확한 호출 가능 표면은 SDK 타입을 기준으로 해야 합니다.

## 소스 형식

플러그인은 plain JavaScript로 충분합니다. JSDoc type import를 사용하면 별도의 TypeScript 빌드 단계를 추가하지 않고도 기대되는 플러그인 형태를 문서화할 수 있습니다.

Vite가 source entry를 처리할 수 있다면 TypeScript도 괜찮습니다. JavaScript가 출력 형식입니다. 소스 구성이 Vite의 일반 처리 범위를 벗어나는 작업을 요구하지 않는 한, 플러그인 작성자가 별도의 빌드 단계를 둘 필요는 없습니다.

## 최소 function plugin

```js
/** @type {import("@fainthit/repair2-plugin-sdk").FunctionExport} */
export default function run({ attributes, ctx }) {
    ctx.logger.info("function plugin ran", attributes);
    return true;
}
```

Function plugin은 짧게 실행됩니다. 매우 구체적인 이유가 없다면, 무언가를 subscribe했을 때 function이 반환되기 전에 정리하세요.

## 최소 element plugin

```js
/** @type {import("@fainthit/repair2-plugin-sdk").ElementExport<{ label?: string }>} */
export default function mount({ attributes, ctx }, { target, dispatchEvent }) {
    target.textContent = attributes.label ?? ctx.plugin.id;

    const onClick = () => dispatchEvent("click");
    target.addEventListener("click", onClick);

    return () => {
        target.removeEventListener("click", onClick);
    };
}
```

Element plugin은 mount function입니다. REPAIR2는 `{ attributes, ctx }`와 `{ target, dispatchEvent }`를 넘겨 호출합니다. 반환된 함수가 있으면 플러그인 cleanup 중에 호출됩니다.

Frame plugin도 같은 mount 형태를 사용하지만, 두 번째 인자로 `{ target, children, showIntro }`를 받습니다. Component element가 렌더링될 위치에 `children`을 append하세요.

여러 element 또는 frame export를 가진 plugin에서는 각 named export에 타입을 붙이세요.

```js
/** @type {import("@fainthit/repair2-plugin-sdk").ElementExport<{ label?: string }>} */
export function primary({ attributes }, { target }) {
    target.textContent = attributes.label ?? "Primary";
}

/** @type {import("@fainthit/repair2-plugin-sdk").ElementExport<{ label?: string }>} */
export function secondary({ attributes }, { target }) {
    target.textContent = attributes.label ?? "Secondary";
}
```

## 타입 참조

Plain JavaScript plugin은 JSDoc type import를 참조로 사용할 수 있습니다. TypeScript plugin은 SDK 타입을 직접 import할 수 있습니다.

에디터가 `HTMLElement` 같은 DOM 타입을 잡지 못한다면 TypeScript 설정에 `DOM` 라이브러리가 포함되어 있는지 확인하세요.

## 다음 단계

- [플러그인 타입](./plugin-types.md)은 어떤 플러그인 타입을 선택해야 하는지 설명합니다.
- [타입 사용법](./type-usage.md)은 일반적인 타입 패턴을 보여줍니다.
- [컨텍스트](./context.md)는 주입되는 `ctx` 객체를 설명합니다.
- [Runtime main](./runtime-main.md)은 main-process entry가 있는 runtime plugin을 설명합니다.
- [호환성과 주의할 점](./compatibility-and-pitfalls.md)은 놓치기 쉬운 규칙을 정리합니다.
- [로드와 HMR](./loading-and-hmr.md)은 프로젝트 수준의 plugin loading, linked plugin, HMR 동작을 설명합니다.
