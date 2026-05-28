# 로드와 HMR

이 문서는 project-level plugin loading 동작을 설명합니다. 첫 플러그인을 작성할 때 대부분의 작성자가 이 세부사항을 모두 알 필요는 없지만, 프로젝트를 패키징하거나 linked plugin source를 사용하거나 HMR 문제를 디버깅할 때 유용합니다.

## 프로젝트 플러그인 로딩

REPAIR2가 시작되거나 프로젝트를 로드하면 project `plugins/` directory에서 유효한 `manifest.json`을 가진 plugin directory를 찾습니다. Manifest `name`이 plugin id입니다. Directory name은 path일 뿐 plugin identity가 아닙니다.

REPAIR2는 project `plugin-links.json` 파일도 읽습니다. 이 파일은 linked plugin의 external source directory를 기록합니다.

```json
{
    "my-plugin": {
        "sourcePath": "D:/path/to/my-plugin"
    }
}
```

`plugin-links.json`은 project 내부 registry입니다. 일반적인 author-edited plugin configuration file로 취급하지 마세요. Editor link/unlink tool이 제공되는 경우 그 도구를 사용하는 것을 선호하세요.

Plugin list가 정해지면 REPAIR2는 각 plugin의 built output이 있는지 확인합니다. Built output이 없는 plugin은 play가 시작되기 전에 빌드됩니다. Development mode가 켜져 있으면 built output이 이미 있어도 linked plugin과 project-local plugin을 다시 빌드합니다.

`main` entry가 있는 runtime plugin은 main process가 main-process output을 로드합니다. Plugin build와 main-side loading이 끝나면 play renderer가 시작되고 ready 상태의 renderer plugin output을 import합니다.

## Source와 built output

Plugin source directory는 작성과 rebuild에 필요합니다. Built output이 이미 있으면 프로젝트 실행만을 위해 source directory가 반드시 필요하지는 않습니다.

Linked plugin은 external source directory가 이동, 삭제되었거나 현재 machine에서 접근할 수 없을 때 unlinked 상태가 될 수 있습니다. 이것은 development source 없이 패키징되었거나 이동된 프로젝트에서 정상적인 상태일 수 있습니다. Project에 해당 plugin의 built output이 남아 있으면 REPAIR2는 plugin을 ready로 취급하고 실행할 수 있습니다.

Unlinked plugin에 필요한 built output이 없다면 source link가 복구되기 전까지 REPAIR2는 해당 plugin을 rebuild할 수 없습니다.

## Loading state

Project plugin state는 다음 단계로 나누어 이해하는 것이 좋습니다.

- REPAIR2가 manifest를 찾아 받아들이면 plugin list에 포함됩니다.
- 예상 output file이 있으면 plugin이 built 상태입니다.
- 현재 built output으로 실행할 수 있으면 plugin이 ready 상태입니다.
- Play renderer는 ready renderer output을 import하고 가능한 한 유지하려고 합니다.

이 상태들은 plugin activation과 같지 않습니다. Element 및 frame plugin은 host component 또는 element가 mount될 때 activate됩니다. Runtime plugin은 project runtime plugin configuration에서 activate됩니다. Function 및 transition plugin은 step, listener, transition path가 호출할 때 실행됩니다.

REPAIR2는 play runtime을 계속 실행하는 것을 우선합니다. Rebuild, import, hot update가 실패하면 사용 가능한 경우 renderer가 이전 import를 계속 사용할 수 있습니다.

## HMR mode

Development mode는 plugin HMR을 활성화합니다. Project load 시 development mode가 켜져 있거나, project settings에서 나중에 켜고 저장하면 REPAIR2는 사용 가능한 source directory가 있는 plugin에 대해 watch build를 시작합니다.

Development mode가 꺼지면 REPAIR2는 active plugin watcher를 중지합니다.

Plugin source 변경은 Vite watch build가 처리합니다. Watch rebuild가 성공하면 REPAIR2는 play renderer에 알리고 affected plugin을 교체할 수 있게 합니다. Element 및 frame replacement는 replacement를 mount하기 전에 이전 plugin을 unmount하고 context를 dispose합니다. Runtime replacement는 이전 renderer runtime instance와, 존재하는 경우 짝지어진 main instance를 dispose합니다.

HMR은 authoring을 위한 기능이며 stable persistence boundary가 아닙니다. Module-level mutable state, 정확한 import timing, 특정 disposal order에 의존하지 마세요.

## Manifest와 directory 변경

HMR이 active일 때 REPAIR2는 project plugin metadata를 감시합니다.

- `plugins/*/manifest.json` 변경
- `plugins/` 바로 아래 directory의 생성, 삭제, rename
- `plugin-links.json` 변경

Project plugin manifest가 변경되면 REPAIR2는 해당 plugin 정보를 다시 로드하고 rebuild합니다. Directory 변경과 `plugin-links.json` 변경은 전체 plugin list rescan을 일으킵니다.

`name`이나 `type` 같은 manifest identity field를 바꾸거나, HMR이 실행 중인 동안 plugin directory structure를 바꾸면 일반 replacement path가 끊길 수 있습니다. 개발 중 plugin identity나 directory layout을 바꿨다면 full plugin reload 또는 project reload가 가장 명확한 복구 방법입니다.

Linked plugin source manifest는 initial link creation 이후 live metadata source로 감시되지 않습니다. 일반 loading과 HMR 중 REPAIR2가 사용하는 metadata는 project copy의 manifest입니다. Linked plugin manifest를 source에서 갱신하는 기능은 추후 지원 예정입니다.

HMR에 의존하는 동안 `plugin-links.json`을 수동으로 삭제, 이동, 재작성하지 마세요. 현재 watcher는 일반적인 registry update를 위한 것이며, 임의의 registry file recovery를 위한 것이 아닙니다.

## Runtime main HMR

`main`이 있는 runtime plugin에서 main instance는 renderer runtime lifecycle을 따릅니다. Renderer activation은 짝지어진 main instance를 만들고, renderer disposal은 그것을 dispose합니다.

HMR 중 main-side source가 변경되면 REPAIR2는 main output을 다시 로드하고 renderer runtime side도 함께 교체합니다. Renderer-side source만 변경되면 main module은 다시 import되지 않을 수 있지만, renderer runtime이 다시 activate되므로 main instance는 다시 생성됩니다.

Bridge API와 activation order는 [Runtime main](./runtime-main.md)을 참고하세요.

## Runtime plugin reset

Project reset step은 runtime plugin reset을 요청할 수 있습니다. 이것은 active runtime plugin을 restart하지만, plugin author는 엄격한 global disposal order나 단일 synchronous disposal moment에 의존하면 안 됩니다. Cleanup은 `ctx.lifecycle.onDispose`에 등록하거나 activation disposer를 반환하세요.

## Duplicate names

Plugin name은 project 안에서 전역입니다. 두 manifest가 같은 `name`을 사용하면 REPAIR2는 duplicate-name warning을 보고하며 어느 plugin이 사용될지 보장하지 않습니다. Plugin type이 서로 달라도 마찬가지입니다.

안정적이고 unique한 namespaced plugin name을 사용하세요.

## Old project migration

REPAIR2 2.4.9 이하에서 만들어진 프로젝트는 old layout의 plugin을 포함할 수 있습니다. REPAIR2가 versioned project data가 없는 old project를 감지하고 `plugins/` directory가 비어 있지 않으면, 기존 plugin directory를 `plugins_old/`로 옮기고 사용자에게 warning을 표시합니다. `plugins_old/`가 이미 있으면 old plugin directory를 옮기기 전에 비워질 수 있습니다.
