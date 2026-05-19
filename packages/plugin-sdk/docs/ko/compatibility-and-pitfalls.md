# Compatibility And Pitfalls

이 문서는 project를 깨뜨리거나 plugin debugging을 어렵게 만들거나 예상하지 못한 runtime side effect를 만드는 흔한 실수를 정리한다.

## 오래된 경로에서는 `ctx`가 없을 수 있음

Element와 frame plugin은 `ctx = null`을 처리해야 한다.

모든 project/runtime이 최신 context implementation을 가진다고 가정하지 않는다.

## Repair Event Scope는 Project Entry를 실행할 수 있음

`ctx.events.emit("channel", data)`는 기본적으로 repair scope를 사용한다. 이 동작은 project event entry를 activate할 수 있다.

Plugin-to-plugin communication 전용 event에는 `scope: "plugin"`을 사용한다. 같은 plugin instance 안에 머물러야 하면 `scope: "local"`을 사용한다.

## Function/Transition Plugin은 Subscription을 두기 좋지 않음

Function과 transition plugin은 보통 short-lived다. Long-lived subscription을 즉시 cleanup하지 않으면 누적될 수 있다.

Long-lived listener는 runtime, element, frame plugin에 둔다.

## Component Handle은 Snapshot

Component handle은 읽은 시점의 runtime state를 반영한다. 영구적인 live object가 아니다.

항상 최신 UI가 필요하면 `ctx.components.subscribe`를 사용한다.

## Invisible은 Deleted가 아님

Invisible component는 runtime state에 계속 존재한다. 나중에 다시 DOM에 mount될 수 있다.

삭제가 실제 의도가 아니라면 invisible component를 remove하지 않는다.

## `remove`와 `clear`는 Destructive Runtime Operation

`ctx.components.remove`와 `ctx.components.clear`는 기존 runtime removal behavior를 호출한다. Transition, DOM removal, plugin context disposal을 trigger할 수 있다.

숨기고 싶을 뿐이면 `setVisible(false)`를 사용한다.

## Preload는 Consume될 수 있음

Resource preload는 runtime state다. Runtime behavior에 따라 resource element 생성이 preloaded element를 consume할 수 있다.

Preload state를 permanent cache나 saved project data로 취급하지 않는다.

## Variable Write는 Runtime Write

`ctx.variables.set`은 runtime state를 변경하고 runtime subscriber에게 알린다. Project data에 저장된 default value를 변경하지는 않는다.

## Plugin Log는 Dialog를 열 수 있음

Warning과 error는 editor dialog를 열 수 있다. High-frequency loop에서 warning/error를 emit하지 않는다.

시끄러운 development status에는 `debug` 또는 `info`를 사용한다.

## Raw App Data는 Internal로 취급

`ctx.app.internal.getAppData()`는 mutable internal `AppData` object를 노출한다. Escape hatch로 사용할 수 있지만 stable public contract가 아니다.

Raw app data에 접근하기 전에 `ctx.app.getConfig`, `ctx.variables`, `ctx.resources`, `ctx.components` 같은 focused API를 먼저 사용한다.

## Component Creation은 Context API가 아님

Component creation은 계속 기존 project actions/steps의 책임이다. `ctx.components`는 이미 존재하는 component를 관찰하고 제어한다.

나중에 명시적으로 API가 추가되기 전까지 `ctx.components`가 component를 생성할 수 있다고 가정하지 않는다.

## Internal에 먼저 의존하지 않기

Global이나 internal module보다 context API를 선호한다. 필요한 context API가 아직 없다면 private internal에 의존하기보다 design gap으로 취급한다.

## Cleanup 없이 Raw DOM Reference 저장하지 않기

Plugin이 `window`, `document`, component element, resource element에 listener를 붙이면 `ctx.lifecycle.onDispose`로 정리한다.

## Safe Defaults

확신이 없을 때:

- `ctx`를 optional로 둔다.
- optional service에는 `tryUse`를 사용한다.
- plugin-only event에는 `scope: "plugin"`을 사용한다.
- `remove` 대신 `setVisible(false)`를 사용한다.
- `warn`보다 먼저 `ctx.logger.info`를 사용한다.
- 모든 manual listener/timer의 cleanup을 등록한다.
- `ctx.store` key를 namespace한다.
