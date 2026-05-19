# Resource And Communication Runtime

Resources, preloads, audio, communication, shortcuts, store access는 project data 주변의 runtime service다. Plugin이 context API를 통해 점점 더 많이 사용하게 될 영역이므로 ownership이 명확해야 한다.

## Resource Intent

Resource는 project asset directory 아래 file을 가리키는 project data entry다. Runtime code는 asset path를 직접 재구성하지 말고 resource helper를 사용해야 한다.

Play resource runtime의 책임:

- resource data에서 runtime media type을 derive한다.
- image/video DOM element를 생성한다.
- preload DOM/state를 관리한다.
- runtime monitor에 preload change를 알린다.

Project로 file을 import하는 것은 책임이 아니다. File selection과 asset copying은 editor/main responsibility다.

## Plugin Resource API Direction

Plugin-facing resource access는 title-based여야 한다. Plugin developer는 보통 uuid보다 resource alias나 file title을 알고 있기 때문이다.

Context resource API는 기존 runtime capability를 감싸야 한다.

- resource handle list
- title로 resource handle 조회
- image/video element 생성
- asset path resolve
- preload state add/remove/query

Raw project resource mutation은 노출하지 않는다.

## Preload Intent

Preload state는 runtime state다. Performance와 editor runtime monitoring에 유용하지만 project data로 저장되지 않는다.

Preload behavior가 바뀌더라도 editor UI가 sync될 수 있도록 runtime monitor notification을 유지한다.

## Audio Intent

Audio는 channel-based runtime state다. Channel은 현재 그 channel에 할당된 sound를 나타내며, 같은 channel에서 새 sound를 play하면 기존 sound를 대체한다.

Audio control이 plugin-facing이 되면 context/audio adapter를 통해 제공하는 것이 좋다. 그 전까지는 step action과 `RepairUtils` compatibility를 유지한다.

## Communication Intent

Native socket과 serial 작업은 main process에 속한다. Play는 main으로 command를 보내고 incoming data를 다시 받는다.

Incoming communication은 두 가지 effect를 가진다.

- 관련 project entry를 activate한다.
- `socket`, `serial` 같은 repair project event를 emit한다.

이것은 project flow이지 plugin-only messaging이 아니다. Communication을 관찰하려는 plugin은 repair event를 listen할 수 있고, private communication은 plugin event scope나 service를 사용해야 한다.

`ctx.communication.socketSend`와 `ctx.communication.serialSend`는 기존 send helper를 감싼다. Incoming communication behavior를 바꾸지 않는다.

## Shortcuts

Shortcuts는 entry-driven project trigger다. Play에서 project data로 초기화되고 main-process global key event를 통해 입력된다.

Shortcut behavior는 focus와 configured key timing에 묶여 있다. Compatibility를 명시적으로 재설계하지 않는 한 generic plugin event로 접으면 안 된다.

## Store Access

Store access는 IPC를 통해 main이 소유한다. Play-side helper는 convenience를 제공하지만 persistent app storage ownership은 main에 남아야 한다.

`ctx.store`는 `RepairUtils.store`와 같은 main-owned IPC path를 사용한다. Renderer storage를 직접 사용하는 것이 아니라 이 ownership boundary 위의 얇은 adapter로 유지해야 한다.

## Compatibility Guidance

- Asset path와 media element creation에는 resource helper를 사용한다.
- Resource import/copy ownership은 editor/main에 유지한다.
- Preload monitor notification을 유지한다.
- Socket/serial ownership은 main에 유지한다.
- Communication-triggered repair event와 plugin-only event를 혼동하지 않는다.
- 명시적으로 허용되고 보고된 변경이 아니라면 `RepairUtils` behavior compatibility를 유지한다.
