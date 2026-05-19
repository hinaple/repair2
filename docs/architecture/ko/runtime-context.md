# Runtime Context

Runtime context는 plugin을 위한 주요 extension surface다. 목적은 mutable internal array를 노출하거나 project-specific fork를 요구하지 않고, plugin이 기존 play runtime을 유용하게 제어할 수 있게 하는 것이다.

## Design Intent

Context는 다음 성격을 가져야 한다.

- additive: 기존 plugin은 context 없이도 계속 동작한다.
- typed: SDK 사용자는 discoverable API를 얻는다.
- bounded: plugin은 runtime internal ownership이 아니라 handle과 service API를 받는다.
- observable: plugin misuse는 editor-visible log로 보고한다.
- disposable: listener, service, runtime plugin work는 lifecycle disposer로 정리된다.

Context는 play renderer가 생성한다. SDK는 shape를 설명하지만 구현하지 않는다.

## Current Context Areas

Context는 runtime responsibility별로 구성된다.

- `plugin`: 현재 plugin instance identity
- `component`, `element`, `frame`: optional runtime identity
- `logger`: editor-visible plugin logs
- `events`: repair/project events와 scoped plugin events
- `components`: 기존 runtime component read/control API
- `variables`: name-based runtime variable access
- `resources`: title-based resource/preload access
- `app`: runtime app configuration, screen size, size ratio, internal app-data escape hatch
- `communication`: 기존 IPC path 위의 socket/serial send adapter
- `store`: main-owned IPC를 통한 persistent app store access
- `services`: plugin-to-plugin service registry
- `lifecycle`: disposer registration

개별 method가 늘어나더라도 이 grouping은 안정적으로 유지한다.

## Identity Model

Plugin identity에는 다음이 포함된다.

- plugin id/name
- singular public plugin type
- per-instance id

Component와 element identity는 두 계층을 노출한다.

- plugin-facing id, 보통 alias-first
- 실제 project uuid

Project author는 보통 alias를 알고 있고, runtime은 compatibility와 replacement behavior를 위해 uuid-level identity가 필요하다.

## Events

`ctx.events.emit/on`은 기본적으로 기존 repair project event path를 사용한다. 따라서 plugin은 entry node를 활성화하거나 event step이 emit한 event를 들을 수 있다.

Project flow가 의도된 것이 아니면 event scope option을 사용한다.

- `scope: "repair"`: 기존 repair project event 사용
- `scope: "plugin"`: plugin들이 공유하는 plugin bus 사용
- `scope: "local"`: 같은 plugin instance로 namespace된 plugin bus 사용

목표는 개발자가 두 개의 서로 다른 event system을 기억하는 것이 아니라, 하나의 event API에서 명시적인 scope를 선택하게 하는 것이다.

## Components

`ctx.components`는 play runtime에 이미 존재하는 component를 관찰하고 제어하기 위한 API다.

이 API가 parallel component creation system이 되면 안 된다. 별도 설계로 creation API를 추가하기 전까지 component creation은 기존 project action을 통해 계속 이루어진다.

Context API는 다음을 지켜야 한다.

- internal component array 대신 stable handle을 노출한다.
- alias-first access를 지원하고 실제 uuid도 handle에 포함한다.
- missing component operation은 plugin log로 보고한다.
- 기존 invisible-component behavior를 보존한다.
- step action semantics를 바꾸지 않는다.

## Variables

`ctx.variables`는 variable name을 사용한다. Plugin developer가 runtime uuid를 hard-code하는 것은 현실적이지 않기 때문이다.

Lower-level variable runtime은 여전히 id로 state를 저장한다. Name-based helper는 plugin과 utility ergonomics를 위한 adapter이며 project data model을 대체하지 않는다.

Missing variable은 report하고 safe value를 반환해야 하며 play를 crash시키면 안 된다.

## Resources

`ctx.resources`는 resource title을 사용한다. Plugin author에게 안정적인 human-readable reference가 필요하기 때문이다.

Resource API는 기존 runtime capability에 집중한다.

- resource list
- resource handle 조회
- image/video DOM element 생성
- asset path resolve
- preload state add/remove/query

Resource import와 project asset copying은 editor/main responsibility다.

## App

`ctx.app`은 read-oriented runtime information을 제공한다.

- 현재 dev mode
- plain config snapshot
- size ratio
- screen size

또한 `ctx.app.internal.getAppData()`를 raw internal app data가 필요한 경우의 명시적인 escape hatch로 제공한다. Raw app data는 mutable이고 stable SDK contract가 아니므로 이름에 `internal`을 포함한다.

## Communication And Store

`ctx.communication.socketSend`와 `ctx.communication.serialSend`는 기존 socket/serial send helper를 감싼다. Incoming communication은 계속 project flow다. Main이 incoming data를 play로 보내고, play는 communication entry를 activate하고 repair event를 emit한다.

`ctx.store`는 main-owned persistent store IPC를 감싼다. Store key는 app-global이므로 plugin code는 namespaced key를 사용해야 한다.

## Services

Services는 events만으로 부족한 direct plugin-to-plugin cooperation을 위한 것이다.

- provider가 named service object를 등록한다.
- consumer가 name으로 use 또는 try-use한다.
- lifecycle cleanup은 disposed plugin instance가 제공한 service를 제거한다.

Callable API에는 service를 사용한다. Broadcast에는 scoped event를 사용한다.

## Lifecycle

모든 context는 lifecycle disposal을 가진다. Listener나 long-lived resource를 등록하는 API는 `ctx.lifecycle.onDispose()`로 cleanup을 등록해야 한다.

Lifecycle은 특히 다음 경우 중요하다.

- HMR replacement
- component removal
- runtime plugin deactivation
- play window unload
- project data replacement

Plugin cleanup failure는 report되어야 하지만 남은 cleanup을 막으면 안 된다.

## Reporting

Expected plugin misuse는 `throw`가 아니라 `pluginReporter`로 보내야 한다.

예:

- missing component
- missing resource
- invalid event scope
- non-function event listener
- duplicate service name

Fatal SDK helper misuse는 SDK package 안에서 throw할 수 있다. 그러나 play-runtime context API는 report와 safe return value를 선호한다.

## Runtime Plugin Direction

Runtime plugin은 context가 더 넓은 API로 존재하는 이유다. Runtime plugin은 existing components를 제어하고 existing events를 들으면서 taskbar, window manager, dashboard, runtime inspector 같은 coordination feature를 만들 수 있어야 한다.

Play renderer를 fork하거나 component runtime을 대체할 필요가 없어야 한다.

Compatibility rules:

- runtime plugin config는 optional이다.
- activation failure는 throw가 아니라 report한다.
- disposer는 deactivation과 unload 때 호출한다.
- startup entry execution order는 안정적으로 유지한다.
- runtime plugin은 raw internal data보다 stable context API를 선호해야 한다.
