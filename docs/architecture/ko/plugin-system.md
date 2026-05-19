# Plugin System

이 문서는 REPAIR v2 plugin의 의도를 설명한다. 기존 HTMLElement 기반 plugin runtime의 호환성을 유지하면서, plugin이 play runtime capability에 더 안전하게 접근할 수 있도록 typed context layer를 추가하는 것이 목표다.

## Runtime Plugin Types

Runtime plugin은 directory type으로 저장된다. 현재 내부 directory name은 plural이다.

- `elements`
- `frames`
- `functions`
- `transitions`
- `runtimes`

Public SDK/context name은 singular를 사용해야 한다.

- `element`
- `frame`
- `function`
- `transition`
- `runtime`

Plural name은 project directory와 직접 연결되기 때문에 존재한다. 이 directory를 in-place로 rename하지 않는다. 더 깔끔한 public API를 노출할 때 mapping layer를 추가한다.

## Svelte Plugin Source Projects

`plugins/svelte-plugins/{name}` 아래의 Svelte plugin project는 source workspace다. 별도의 runtime plugin type이 아니다.

Build하면 선택한 build target에 따라 `plugins/elements` 또는 `plugins/frames` 아래의 일반 runtime plugin file이 된다. 이렇게 하면 play가 JavaScript plugin output을 load하고 기존 plugin manager path로 사용하는 현재 runtime model이 유지된다.

나중에 play에서 Svelte를 직접 mount하는 방식이 유용할 수 있다. 그러나 같은 SDK/context 개념 뒤에 있는 adapter로 도입해야 하며, 호환성을 의도적으로 재설계하기 전까지 현재 plugin output format을 대체하면 안 된다.

## SDK 위치

설치된 build는 SDK package를 app data에 복사한다.

```text
%APPDATA%/repair2/sdk/repair2-plugin-sdk
```

Runtime plugin file은 아래에 있다.

```text
%APPDATA%/repair2/project/plugins/{pluginType}
```

Vanilla plugin file은 고정된 plugin directory에서 app-data SDK까지의 상대 JSDoc import를 사용한다. Svelte source project는 `project/plugins/svelte-plugins/{name}` 기준 `../../../../sdk/repair2-plugin-sdk`를 가리키는 `file:` dependency를 사용할 수 있다.

App은 load 때마다 SDK file을 각 project로 copy하지 않는다. SDK install/update는 installer와 app-data setup path의 책임이다.

## Import And Use Responsibility

Shared `PluginPointer` model은 plugin을 name, payloads, owning type으로 식별한다. Play에서는 `pluginManager.js`가 `PluginPointer`에 runtime behavior를 붙인다.

이 분리는 의도적이다.

- shared classes는 project data shape을 설명한다.
- play renderer는 plugin import, instantiate, hot reload, context 전달 방식을 결정한다.

`PluginPointer`만으로 runtime behavior를 이해했다고 가정하지 않는다. Runtime semantics는 play plugin manager를 함께 확인한다.

## Context Injection

Element와 frame plugin은 constructor option으로 optional `ctx`를 받는다.

```js
new PluginElement({
    modules,
    attributes,
    ctx
});
```

기존 plugin은 `ctx`를 무시해도 된다. 새 plugin은 가능하면 global에 직접 접근하지 말고 `ctx`를 사용한다.

Function과 transition plugin도 play plugin manager wrapper를 통해 call argument로 context를 받는다. 이는 additive여야 하며 기존 function plugin이 계속 동작해야 한다.

SDK는 plugin kind별 type-specific context를 노출한다. `RepairPluginContext`는 compatibility union으로 남지만, 새 code는 plugin contract가 의미하는 specific type을 선호해야 한다.

## Runtime Plugins

Runtime plugin은 optional config에서 활성화되는 project-level plugin이다. 목적은 play window 전체를 대체하지 않고 components, resources, variables, events를 가로질러 behavior를 조율하는 것이다.

Runtime plugin activation은 다음 contract를 따른다.

```ts
activate(args: {
    attributes: Record<string, unknown>;
    modules?: Record<string, unknown> | null;
    ctx: RepairRuntimePluginContext;
}): void | (() => void) | Promise<void | (() => void)>
```

Return된 disposer는 runtime plugin deactivation, project data replacement, play window unload 시 호출된다.

Runtime plugin load/activation failure는 plugin reporting으로 전달되어야 하며 play를 중단하면 안 된다.

## HMR Direction

HMR은 plugin file이 변경될 때 runtime instance를 교체하기 위한 development feature다.

보존해야 할 중요한 behavior:

- component frame plugin은 project 전체를 다시 만들지 않고 교체될 수 있다.
- element plugin은 surrounding component runtime을 유지한 채 교체될 수 있다.
- plugin DOM instance가 교체될 때 old plugin context는 dispose되어야 한다.

HMR code는 실용적이고 renderer-specific이어도 된다. `PluginPointer` data를 넘어서 shared classes로 새 runtime logic이 새면 안 된다.

## Dependency Direction

Plugin dependencies는 play plugin manager와 main-process package installation path를 통해 load된다. Plugin runtime이 package를 직접 install하면 안 된다.

SDK는 dependency declaration을 type할 수 있지만, 실제 package resolution과 installation은 application이 계속 소유한다.

## Compatibility Guidance

- 모든 기존 plugin style에서 `ctx`는 optional이어야 한다.
- Function plugin의 `{ attributes, modules, ...argument }` compatibility를 유지한다.
- Function wrapper 없이 transition keyframe plugin이 계속 동작해야 한다.
- Directory name compatibility를 유지한다.
- Runtime plugin behavior는 optional config를 통해서만 추가한다.
- Plugin failure는 uncaught play exception이 아니라 editor-visible plugin log로 보고한다.
