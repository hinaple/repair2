# Execution Model

Play execution model은 data-driven이다. Project data에 저장된 entries, nodes, steps, outputs가 무엇이 실행될지 결정한다. Plugin context API는 이 model을 확장해야 하며, 의도치 않게 우회하면 안 된다.

## Startup Intent

Play는 app data 초기화 후 startup entry를 enter하면서 시작한다.

Startup order는 compatibility-sensitive하다. 기존 project가 variables, shortcuts, runtime plugins, entry state가 현재 순서로 초기화되는 것에 의존할 수 있기 때문이다. Startup execution을 가볍게 이동하지 않는다.

## Prototype Binding

여러 shared project class는 play entry path에서 prototype binding으로 play behavior를 받는다. 이것은 legacy/runtime adapter pattern이다.

- shared classes는 project data shape을 유지한다.
- play가 execution behavior를 붙인다.
- editor는 같은 class를 play behavior 없이 사용할 수 있다.

Execution을 변경할 때는 shared class와 play adapter를 모두 확인한다. Editor impact를 확인하지 않고 execution behavior를 shared class로 옮기지 않는다.

## Entries And Outputs

Entry는 project graph로 들어오는 external trigger다. Startup, shortcuts, communication, repair project events가 여기에 포함된다.

Output은 node id로 한 node를 다른 node에 연결한다. Missing target이나 disabled target은 throw하지 않고 cleanly stop해야 한다.

의도는 project flow failure가 play를 crash시키지 않고 no-op하거나 적절한 visible path로 report되게 하는 것이다.

## Steps And Actions

Step은 기존 step action table을 통해 resolve된다. 기존 step payload는 compatibility-critical하다.

Action family에는 components, preloads, audio, communication, delay, variable updates, custom reset, plugin execution, project event emit, script, log가 포함된다.

새 runtime context API는 기존 step data resolution 방식을 바꾸면 안 된다. 나중에 action registry가 추가되더라도 old project를 위해 현재 step action resolution path를 보존해야 한다.

## Waiting And Reset

Async step은 reset이 waiting execution을 해제할 수 있도록 추적된다. Interactive project에서 reset은 pending delay나 plugin work를 멈춰야 하며 hidden execution을 남기면 안 된다.

Custom reset은 여러 runtime subsystem을 조율한다.

- audio
- variables
- components
- waiting steps
- preloads
- entries

새 long-running runtime feature는 같은 reset/lifecycle 사고방식과 통합되어야 한다.

## Project Events

Repair project event는 project execution의 일부다. Repair event를 emit하면 entry node가 활성화될 수 있다.

Plugin context는 plugin이 project event를 trigger하거나 listen해야 하는 경우가 많기 때문에 기본적으로 이 path를 사용한다. Plugin-only communication은 repair event 대신 scoped plugin event를 사용한다.

## Script And Plugin Failures

User script와 plugin은 extension point이므로 failure가 격리되어야 한다.

방향:

- plugin-facing failure는 plugin reporting으로 보낸다.
- expected plugin misuse는 play를 통과해 throw되면 안 된다.
- legacy script behavior는 별도 결정 없이 바꾸지 않는다.

## Compatibility Guidance

- Startup entry behavior를 보존한다.
- 기존 step payload meaning을 보존한다.
- Waiting step reset behavior를 보존한다.
- Event scope를 사용해 project event와 plugin-only communication을 구분한다.
- 새 execution extension point를 추가할 때는 execution model 재작성보다 기존 action 주변 adapter를 선호한다.
