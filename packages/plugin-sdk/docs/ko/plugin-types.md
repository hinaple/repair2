# Plugin Types

이 문서는 REPAIR plugin type별 사용 방식과 안전한 lifecycle assumption을 설명한다.

## Element Plugins

Element plugin은 component element 안에 DOM을 render한다.

사용하기 좋은 경우:

- custom visual controls
- interactive widgets
- specialized media views
- single component element에 속한 UI

Element plugin은 HTMLElement constructor다. 다음 값을 받을 수 있다.

- `attributes`
- `modules`
- `ctx`

`ctx`는 optional로 취급한다. Element plugin은 element lifecycle에 묶인 long-lived subscription을 안전하게 사용할 수 있다. Element가 제거되거나 교체되면 context disposal이 일어나야 한다.

좋은 context 사용:

- mount error log
- plugin-scoped event listen
- variable로 UI update
- resource read
- mounted 동안 작은 service expose

피할 것:

- 명확한 목적 없이 unrelated global runtime state 제어
- element가 영원히 mount된다고 가정
- component handle을 영구 저장

## Frame Plugins

Frame plugin은 component 전체를 감싼다. Frame이 있으면 child element는 frame 안에 render된다.

사용하기 좋은 경우:

- custom component containers
- window-like chrome
- layout shells
- component-level visual treatment

Frame plugin은 `ctx.component`로 component identity를 받는다. Element plugin보다 component-level UI에 가깝기 때문에 `ctx.components`로 자기 component를 inspect하거나 adjust하는 것이 자연스럽다.

모든 window를 전역으로 관리하는 책임을 frame plugin에 주지 않는다. Cross-component coordination에는 runtime plugin을 사용한다.

## Runtime Plugins

Runtime plugin은 project/play-runtime level에서 activate된다.

사용하기 좋은 경우:

- taskbars
- global window managers
- runtime inspectors
- cross-plugin services
- project-wide event coordination
- component dashboards

Runtime plugin은 long-lived subscription과 service를 두기 가장 안전한 위치다. `activate({ attributes, modules, ctx })`는 disposer를 return할 수 있다.

Runtime plugin은 existing runtime object를 조율해야 한다. `ctx.app`, `ctx.communication`, `ctx.store`, events, services, variables, resources, components를 사용해 global behavior를 만들 수 있다. Project execution을 대체하거나 parallel component system을 만들거나 raw project data를 mutate해서는 안 된다. Stable context API가 없는 경우에만 raw app data를 escape hatch로 사용한다.

## Function Plugins

Function plugin은 step, listener, 다른 execution path에서 short-lived logic으로 실행된다.

사용하기 좋은 경우:

- calculations
- validation
- small async actions
- custom listener conditions
- integration glue

Function plugin은 `ctx`를 받을 수 있지만 app-wide listener나 long-lived subscription을 등록하면 안 된다. Subscribe해야 한다면 명시적으로 안전한 경우가 아니라면 return 전에 unsubscribe한다.

값을 return하고 다음 동작은 caller가 결정하게 하는 방식을 선호한다.

현재 runtime은 `function` property를 가진 object export를 function plugin contract로 지원한다. Bare function export는 현재 contract에 포함되지 않는다.

## Transition Plugins

Transition plugin은 keyframes를 제공하거나 생성한다.

사용하기 좋은 경우:

- reusable animation definitions
- attribute-driven transition variants
- dynamic keyframe generation

Transition plugin은 animation output에 집중해야 한다. 아주 구체적인 이유가 없다면 runtime subscription, component mutation, project event emission을 피한다.

현재 runtime은 `keyframes` 또는 `function` property를 가진 object export를 transition plugin contract로 지원한다. `defineTransitionPlugin([...])`은 keyframe array를 감싸는 helper convenience다.

## Runtime과 Frame 중 선택

Behavior가 한 component container에 속하면 frame plugin을 사용한다.

Behavior가 여러 component를 가로지르거나 global state가 필요하면 runtime plugin을 사용한다.

예:

- 한 component의 draggable title bar는 frame plugin이 될 수 있다.
- 열린 모든 component를 나열하는 taskbar는 runtime plugin이어야 한다.

## Events와 Services 중 선택

Broadcast나 loosely coupled notification에는 event를 사용한다.

다른 plugin이 named API를 call해야 하면 service를 사용한다.

Service는 play runtime 안에서 global이므로 namespaced name을 사용한다.

## Lifecycle Summary

| Plugin Type | Long-lived subscriptions | Typical cleanup |
| --- | --- | --- |
| runtime | 안전함 | `activate`에서 disposer return 또는 `ctx.lifecycle` 사용 |
| element | element에 묶이면 안전함 | element removal/replacement 시 context disposal |
| frame | frame에 묶이면 안전함 | frame removal/replacement 시 context disposal |
| function | 피할 것 | return 전에 unsubscribe |
| transition | 피할 것 | 보통 long-lived work 없음 |
