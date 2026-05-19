# IPC Map

IPC는 main, play, editor 사이의 ownership boundary를 보존하기 위해 존재한다. 이 문서는 모든 call-site detail보다 channel intent에 집중한다.

## Ownership Rules

Main process가 소유하는 것:

- project directory와 `.repair` import/export
- native dialogs
- plugin package installation
- socket/serial native bridge
- window lifecycle
- cross-renderer forwarding
- persistent app store

Play renderer가 소유하는 것:

- project execution
- runtime components
- runtime variables
- preloads/audio runtime state
- plugin use와 runtime context

Editor renderer가 소유하는 것:

- editing UI
- project save request
- resource selection UI
- runtime monitor display
- toast/notification UI

IPC는 이 boundary를 강화해야 한다. Filesystem, native dialog, package installation, native device ownership을 main 우회로 처리하지 않는다.

## Main-Owned Request Channels

이 channel들은 main이 handle하고 renderer가 call한다.

| Channel | Intent |
| --- | --- |
| `request-data` | Current project data와 global styles를 반환한다. |
| `update-data` | Editor data를 저장하고 play data와 devtool data를 갱신한다. |
| `getDataDir` | Current project data directory를 반환한다. |
| `selectFile` | Native file picker를 연다. |
| `dialogue` | Native message dialog를 연다. |
| `copyInfoAsset` | External file을 project asset directory로 copy한다. |
| `getPluginList` | Plugin directory listing을 반환하거나 refresh한다. |
| `plugin:install-package` | Main ownership을 통해 plugin dependency package를 install/load한다. |
| `editor-on` | Editor를 열거나 focus한다. |
| `request-execute` | Play에게 node 또는 entry execution을 요청한다. |
| `layout-preview` / `preview-content-visible` / `stop-preview` | Editor preview request를 play로 forward한다. |
| socket/serial command channels | Main-owned connector에게 connect/send/close를 요청한다. |
| `monitor-event` | Runtime monitor start/end event를 forward한다. |
| `monitor-info` | Play runtime monitor state를 editor로 forward한다. |
| `custom-log` | Project custom log message를 editor toast UI로 forward한다. |
| `plugin-log` | Plugin log를 editor toast/dialog로 forward하고 optional file logging을 수행한다. |
| `get-store` / `set-store` | Main-owned persistent store에 접근한다. |

## Main-To-Play Channels

Main은 external state가 바뀌거나 editor가 runtime behavior를 요청할 때 play로 보낸다.

| Channel | Intent |
| --- | --- |
| `data` | Editor save 후 play app data를 replace한다. |
| `global-css` | Development 중 play global CSS를 update한다. |
| `plugin-hmr` | Plugin이 변경되어 reload되어야 함을 play에 알린다. |
| `socket-income` / `serial-income` | Communication data를 play execution과 repair event로 feed한다. |
| `global-key-event` | Main key handling으로 shortcut entry를 구동한다. |
| `monitor-event` | Runtime monitoring을 start/stop한다. |
| `request-execute` | Editor request로 node를 execute하거나 entry를 enter한다. |
| preview channels | Editor layout preview를 play에서 render하거나 clear한다. |

## Main-To-Editor Channels

Main은 UI update와 notification을 위해 editor로 보낸다.

| Channel | Intent |
| --- | --- |
| `request-save` | Editor에게 save를 요청한다. |
| undo/redo/zoom channels | Editor menu command를 실행한다. |
| export channels | Import/export progress를 표시한다. |
| `socket-income` / `socket-failed` / `serial-income` / `serial-connected` | Communication notification을 표시한다. |
| `monitor-info` | Runtime monitor UI를 update한다. |
| `custom-log` | Project custom log를 표시한다. |
| `plugin-log` | Plugin identity와 detail이 포함된 plugin log를 표시한다. |

## Plugin Reporting Path

Plugin context와 plugin manager code는 user-visible plugin issue에 `plugin-log`를 사용해야 한다.

의도한 flow:

1. Play가 plugin issue/exception을 report한다.
2. Main이 editor로 forward한다.
3. Editor가 toast content를 표시한다.
4. Warning/error일 때 main이 dialog를 연다.
5. 필요하면 main이 error detail을 기존 log-file path에 기록한다.

이렇게 하면 plugin development feedback이 play를 멈추지 않고도 보인다.

## Guidance

- Ownership과 payload semantics가 맞으면 기존 channel을 재사용한다.
- Ownership이 실제로 다를 때만 channel을 추가한다.
- Native와 filesystem operation은 main에 유지한다.
- Plugin log는 project `custom-log`와 분리한다.
- 새 IPC ownership을 추가하면 이 문서를 업데이트한다.
