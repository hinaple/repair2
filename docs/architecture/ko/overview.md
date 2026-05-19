# REPAIR v2 Architecture Notes

이 문서는 REPAIR v2를 확장 가능하게 유지하면서 기존 프로젝트를 깨뜨리지 않기 위한 개발 가이드다. 문서에서는 아키텍처 의도, 책임 경계, 호환성 규칙을 설명한다. 작은 알고리즘이나 코드만 읽어도 바로 알 수 있는 구현 세부사항은 코드에 남긴다.

영어 문서는 구현 작업의 기준 문서이며, 한국어 문서는 그 번역본이다.

## Document Map

- `ipc-map.md`: process ownership과 IPC channel 의도.
- `project-data-schema.md`: project data 호환성 규칙과 optional field 정책.
- `execution-model.md`: play execution이 entry, node, step, action으로 구동되는 방식.
- `component-runtime.md`: component data가 play DOM이 되는 방식과 plugin의 관찰/제어 방향.
- `plugin-system.md`: plugin directory, import/use semantics, HMR, public SDK 방향.
- `runtime-context.md`: plugin context 설계, reporting, lifecycle, runtime plugin 방향.
- `resource-communication-runtime.md`: resources, preloads, audio, communication, shortcuts, store ownership.

## Core Shape

REPAIR v2는 하나의 main process와 두 개의 renderer process를 가진 Electron app이다.

- Main process: project files, native dialogs, plugin package installation, window lifecycle, socket/serial bridge, renderer 간 forwarding을 소유한다.
- Play renderer: project execution, runtime component DOM, runtime variables, media/preload state, plugin use, runtime monitoring을 소유한다.
- Editor renderer: project editing, graph UI, resource management UI, editor-side notification을 소유한다.
- Shared renderer classes: `src/renderer/classes`는 editor와 play가 함께 사용하는 project model class를 담는다.

Play와 editor는 별도의 Vite root를 갖지만 `@classes`를 공유한다. Shared class에 추가하는 코드는 양쪽 renderer에서 안전해야 하며, renderer별 동작은 기존 `//#only play` / `//#only editor` convention으로 격리한다.

## Design Direction

주요 목표는 사용자가 play window 전체를 fork하거나 기능 전체를 monolithic plugin으로 다시 만들지 않고도 plugin에 더 많은 제어권을 주는 것이다.

의도한 방향은 다음과 같다.

- 기존 project data와 runtime behavior를 호환되게 유지한다.
- 기존 play capability 주변에 optional runtime context API를 추가한다.
- core step execution을 다시 짜기보다 좁은 adapter를 선호한다.
- plugin이 별도 시스템을 만들기보다 기존 runtime object를 관찰하고 제어하게 한다.
- plugin mistake는 play를 crash시키지 않고 editor-visible reporting으로 보낸다.

따라서 새 plugin API는 보통 기존 runtime ownership을 감싼다.

- components는 play component manager/registry를 통해 접근한다.
- variables는 runtime variable state를 통해 접근한다.
- resources는 resource/preload manager를 통해 접근한다.
- project event는 project flow가 의도된 경우 기존 repair event system을 사용한다.
- plugin-only communication은 scoped plugin events/services를 사용한다.

## Compatibility Policy

기존 `.repair` project 호환성이 가장 우선이다.

규칙:

- 새 project data field는 optional이어야 한다.
- old data는 constructor default를 통해 계속 load되어야 한다.
- 기존 step payload 의미를 바꾸지 않는다.
- 기존 `RepairUtils`와 step action behavior는 명시적으로 수락되지 않는 한 바꾸지 않는다.
- 기존 plugin constructor는 `ctx` 없이도 계속 동작해야 한다.
- 기존 plugin directory name은 계속 동작해야 한다.
- runtime plugin config는 optional이어야 하며, config가 없는 project는 이전처럼 동작해야 한다.

의도적인 behavior change가 있으면 구현 후 명확히 보고한다.

## Public API Direction

내부 plugin directory는 plural(`elements`, `frames`, `functions`, `transitions`, `runtimes`)이다. Public SDK/context language는 singular(`element`, `frame`, `function`, `transition`, `runtime`)를 선호하고 내부적으로 mapping한다.

SDK package는 `@fainthit/repair2-plugin-sdk`다. SDK는 stable typing과 helper wrapper를 제공해야 하며 application internal을 import하지 않는다. 설치된 build는 SDK를 app data의 `sdk/repair2-plugin-sdk` 아래로 복사하고, 실제 context object는 play renderer가 생성한다.

## Error And Log Direction

Plugin-facing error는 개발자에게 보여야 하지만 expected misuse 때문에 play execution이 멈추면 안 된다.

Plugin reporting path를 사용한다.

1. Play가 `plugin-log`를 보낸다.
2. Main이 editor로 전달한다.
3. Editor가 toast를 표시한다.
4. Warning/error log는 dialog도 열 수 있다.
5. Error log는 기존 log-file path에 기록될 수 있다.

Thrown error는 play renderer를 crash시키지 않는 SDK helper misuse처럼 plugin development 내부 실패에만 사용한다.

## Shared Classes Rule

Shared classes는 project model class이지 renderer service container가 아니다.

추가하지 말아야 할 것:

- DOM manipulation
- editor UI side effect
- play runtime side effect
- IPC ownership

Renderer-specific behavior가 불가피하면 기존 only-block convention으로 격리한다. 새 behavior는 play/editor adapter에 두는 것을 선호한다.

## Future Cleanup Direction

Cleanup은 점진적으로, 호환성을 유지하면서 진행한다.

좋은 cleanup 대상:

- name/title/id lookup helper 중앙화
- `PluginPointer`를 data에 가깝게 유지하고 runtime behavior를 play adapter로 이동
- plugin context API와 SDK type 동기화
- context, `RepairUtils`, step actions 사이의 component/resource/variable control 중복 감소
- Svelte-native mounting은 현재 HTMLElement plugin runtime을 대체하는 것이 아니라 나중에 가능한 adapter로 유지
