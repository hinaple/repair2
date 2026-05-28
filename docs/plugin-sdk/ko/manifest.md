# 매니페스트

모든 플러그인 디렉터리에는 `manifest.json` 파일이 있습니다. REPAIR2는 이 파일을 읽고 무엇을 빌드할지, 플러그인을 어떻게 로드할지 결정합니다.

매니페스트 파일은 JSON입니다. JavaScript 및 TypeScript 매니페스트 파일은 아직 지원하지 않으며, 추후 지원 예정입니다.

## 스키마

에디터 자동완성과 작성 시점 검증을 위해 schema를 사용하세요.

```json
{
    "$schema": "./node_modules/@fainthit/repair2-plugin-sdk/plugin-manifest.schema.json",
    "name": "my-plugin",
    "type": "function"
}
```

스키마는 공개 매니페스트 형태를 설명합니다. 현재 런타임 로딩은 전체 스키마를 검증하지 않습니다. REPAIR2는 `manifest.json`을 읽고, JSON을 파싱하고, `name`과 `type`을 확인하고, `type`이 알려진 플러그인 타입 중 하나인지 확인한 다음, 기본값 정규화, 빌드 경로, 런타임 등록을 소유합니다.

## 공통 필드

```json
{
    "name": "my-plugin",
    "description": "Adds a custom labeled element.",
    "type": "element",
    "entry": "src/index.js",
    "outDir": "dist",
    "attributes": ["label"]
}
```

`name`은 플러그인 id입니다. REPAIR2는 directory name이 아니라 manifest name으로 플러그인을 식별합니다. Plugin name은 모든 plugin type을 통틀어 전역적으로 unique해야 합니다. 두 manifest가 같은 name을 사용하면 REPAIR2는 duplicate-name warning을 보고하며, 어떤 plugin이 선택될지 보장하지 않습니다.

Scaffold로 만든 플러그인 이름은 lowercase kebab-case로 정규화됩니다. 스키마는 권장 공개 형태를 문서화합니다. 현재 런타임 로딩에는 비어 있지 않은 `name`과 알려진 플러그인 `type`이 필요합니다.

`description`은 사람이 읽을 수 있는 선택적 플러그인 설명입니다.

`type`은 다음 중 하나여야 합니다.

- `runtime`
- `element`
- `frame`
- `function`
- `transition`

`entry`는 플러그인 루트를 기준으로 한 source entry 경로입니다. REPAIR2는 이 entry를 Vite로 빌드하고 빌드된 JavaScript 출력을 import합니다.

`outDir`은 플러그인 루트를 기준으로 한 renderer/plugin 출력 디렉터리입니다.

`attributes`는 REPAIR2 에디터에 표시되거나 설정되는 공개 attribute 이름을 선언합니다. 런타임에서는 저장된 payload 객체가 `attributes`로 플러그인 코드에 전달됩니다. 매니페스트 선언은 런타임 payload를 type-check, validate, filter하지 않습니다.

`attr`은 `attributes`의 legacy alias입니다. `attributes`를 선호하세요. 두 필드가 모두 있으면 `attributes`가 우선하고 `attr`은 무시됩니다.

## 기본 경로

runtime main entry가 없는 플러그인의 기본 경로는 다음과 같습니다.

```json
{
    "entry": "src/index.js",
    "outDir": "dist"
}
```

`main`이 있는 runtime plugin의 기본 renderer 경로는 다음과 같습니다.

```json
{
    "entry": "src/renderer/index.js",
    "outDir": "dist/renderer"
}
```

기본 main 경로는 다음과 같습니다.

```json
{
    "main": {
        "entry": "src/main/index.js",
        "outDir": "dist/main"
    }
}
```

이 경로들을 명시적으로 작성할 수 있지만 반드시 그럴 필요는 없습니다.

## Runtime steps

Runtime plugin은 `steps`로 호출 가능한 step 이름을 선언할 수 있습니다.

```json
{
    "name": "window-tools",
    "type": "runtime",
    "steps": {
        "open": ["target"],
        "close": null
    }
}
```

객체 형태는 각 step 이름을 에디터가 해당 step에 표시해야 할 attribute input 이름에 매핑합니다. 이것은 payload schema가 아니며 method signature를 생성하지 않습니다.

Runtime plugin 객체는 같은 이름의 method를 정의해야 합니다.

```js
export default {
    open({ attributes }) {},
    close() {}
};
```

Step-specific attribute input 없이 step 이름만 필요할 때는 배열 형태도 허용됩니다.

```json
{
    "steps": ["open", "close"]
}
```

## Runtime main entry

Runtime plugin은 main-process entry를 추가할 수 있습니다.

```json
{
    "name": "bridge-plugin",
    "type": "runtime",
    "main": {
        "entry": "src/main/index.js",
        "outDir": "dist/main"
    }
}
```

이 플러그인은 여전히 `runtime` plugin입니다. `main` 필드는 플러그인에 main-process side를 추가합니다.

`main`이 있으면 REPAIR2는 renderer entry와 main entry를 모두 빌드합니다.

## Svelte

Element 및 frame plugin은 `svelte: true`를 설정할 수 있습니다.

```json
{
    "name": "svelte-element",
    "type": "element",
    "svelte": true
}
```

활성화하면 REPAIR2가 플러그인 소스를 빌드하는 동안 Svelte Vite plugin을 추가합니다. 별도의 플러그인 타입을 만들거나 런타임 export contract를 바꾸지는 않습니다.
