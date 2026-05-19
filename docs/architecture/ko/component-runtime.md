# Component Runtime

Component runtime은 project component data를 play renderer의 DOM으로 바꾼다. 또한 runtime plugin이 가장 많이 관찰하고 제어하려는 surface다.

## Design Intent

Component는 계속 project-owned runtime object다. Plugin은 context API를 통해 component를 관찰하고 수정할 수 있지만, component creation의 source는 기존 step/action path로 남는다.

이렇게 해야 호환성이 유지된다.

- 기존 `Component.create` step이 계속 동작한다.
- invisible component는 DOM에 없더라도 실제 runtime component로 남는다.
- alias는 replacement/removal에서 기존 역할을 유지한다.
- unbreakable component는 기존 protection semantics를 유지한다.

Project data model을 의도적으로 재설계하지 않는 한 plugin을 위한 두 번째 component system을 만들지 않는다.

## Ownership

`components.js`는 runtime component list와 `#gamezone` DOM insertion/removal을 소유한다.

`componentRegistry.js`는 plugin-safe handle과 subscription을 노출한다. Plugin이 mutable internal array를 받지 않고 component를 관찰할 수 있도록 존재한다.

이 분리는 의도적이다.

- component manager는 runtime state를 mutate한다.
- registry는 stable read handle을 제공한다.
- plugin context는 missing/invalid operation을 어떻게 report할지 결정한다.

## Identity

Runtime component identity에는 두 계층이 있다.

- `realId`: stored project uuid
- `id`: plugin-facing id, 현재는 `aliasOrId`를 통한 alias-first 값

Plugin author는 보통 uuid가 아니라 alias를 안다. 따라서 context API는 가능한 alias-first id를 받되, handle에는 diagnostics와 precise tooling을 위해 `realId`도 포함한다.

## Visibility

`visible`은 component가 DOM에 mount되어 있는지를 제어한다. Runtime component가 존재하는지 여부가 아니다.

Project는 invisibility를 빠르게 toggle하면서 component object가 유지되기를 기대할 수 있다. Invisible component를 deleted component처럼 취급하지 않는다.

미래 component API도 명시적인 재설계 없이는 이 behavior를 보존해야 한다.

## Frames And Elements

Component는 frame plugin을 가질 수 있다. Frame이 있으면 child element는 frame element 안에 render된다. Frame이 없으면 child element는 component에 직접 render된다.

Frame과 element plugin context는 자신이 어디에 mount되었는지 이해할 수 있도록 component/element identity를 받는다.

HMR이나 component removal로 plugin DOM이 교체될 때 old plugin context는 dispose되어야 한다.

## Component Context API

`ctx.components`는 기존 runtime component behavior 위에 있는 adapter다.

의도:

- runtime component handle list 제공
- alias-first id 또는 real id로 component handle 조회
- component handle change subscribe
- 기존 runtime manager function으로 existing component remove/clear/modify
- invalid operation을 plugin log로 report

Internal array를 그대로 노출하지 않고, 아직 component를 생성하지 않는다.

## Registry Handle Direction

Component handle은 plugin developer에게 충분히 안정적이어야 하지만 internal ownership을 의미하면 안 된다.

유용한 handle data:

- plugin-facing id
- real project id
- alias
- visibility
- z-index
- advanced case를 위한 DOM element reference
- unbreakable state, frame presence, child element count 같은 metadata

Plugin이 fragile internal에 의존하게 만드는 field라면 method 뒤에 숨기거나 생략한다.

## Step Actions And RepairUtils

Step action은 compatibility-critical하다. 기존 component manager function을 계속 사용하고 기존 payload semantics를 유지해야 한다.

`RepairUtils` compatibility도 중요하다. Context API는 시간이 지나며 더 깔끔해질 수 있지만, `RepairUtils`는 의도적으로 변경하고 behavior change를 보고해야 한다.

## Preview Is Separate

Editor layout preview는 runtime component creation과 다르다. Preview는 editing support를 위해 layout을 재구성하며 runtime component handle의 source로 취급하면 안 된다.

Plugin context API는 preview-only DOM이 아니라 실제 play runtime component를 대상으로 한다.

## Compatibility Guidance

- `aliasOrId` behavior를 유지한다.
- Component를 hide할 때 invisible component를 삭제하지 않는다.
- Mutable component array를 plugin에 노출하지 않는다.
- Plugin DOM이 교체되거나 제거될 때 plugin context를 dispose한다.
- Context misuse는 throw가 아니라 plugin log로 report한다.
- Component creation API는 명시적인 설계 결정 후에만 추가한다.
