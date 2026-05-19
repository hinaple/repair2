# Project Data Schema

이 문서는 project data compatibility intent를 기록한다. Full JSON Schema가 아니다. 정확한 field-level shape은 model constructor와 `storeData` method가 정의한다.

## Compatibility Intent

Project data는 가능한 forward-tolerant, backward-tolerant해야 한다.

- old project는 constructor default로 load되어야 한다.
- new field는 optional이어야 한다.
- 기존 field meaning을 바꾸면 안 된다.
- runtime-only state가 실수로 saved project data가 되면 안 된다.

`.repair` format은 project directory를 archive한다. 따라서 compatibility는 `data.json` semantics뿐 아니라 assets, plugins, styles 같은 project directory layout도 포함한다.

## Top-Level Data

Saved project data의 중심은 다음이다.

- `config`
- `nodes`
- `variables`
- `resources`
- `viewport` 같은 editor-only view state

Older default data에는 newer editor save가 포함하는 field가 없을 수 있다. Constructor는 계속 safe default를 제공해야 한다.

## Config

Config는 play window behavior와 editor/runtime option을 소유한다. Play가 startup 중 config를 읽기 때문에 새 config field는 특히 compatibility-sensitive하다.

현재 방향:

- runtime plugin config는 optional이다.
- old screen config migration path를 유지한다.
- 새 play/runtime option은 absent일 때 existing behavior를 default로 해야 한다.

Old project가 열리기 전에 config field를 추가해야 하는 상황을 만들면 안 된다.

## Resources

Resource data는 identity와 path/alias 정보를 저장한다. File type은 runtime에서 path extension으로 derive된다.

Preload status 같은 resource runtime state는 resource data로 저장하면 안 된다. 그것은 play runtime과 monitoring에 속한다.

## Variables

Variable data는 default value를 저장한다. Play는 load 시 project variable로 runtime variable state를 만든다.

Runtime variable value는 미래 feature가 명시적으로 저장하도록 설계하지 않는 한 project data가 아니다.

Plugin은 보통 context를 통해 variable name을 사용해야 하지만, project schema는 stored reference에 계속 id를 사용한다.

## Nodes And Steps

Nodes와 steps는 execution graph다. Stored payload는 compatibility-critical하다.

Play의 step action table이 existing step data를 해석한다. Stored payload meaning을 변경하지 않는다. 새 action capability가 필요하면 기존 payload를 재정의하지 말고 new optional payload shape이나 new action type을 추가한다.

## Components And Elements

Component는 현재 component creation step payload 안에 저장된다. Component는 id, optional alias, visibility, style/layout, frame plugin pointer, transitions, element list를 가진다.

Runtime component API는 stored identity model을 존중해야 한다.

- uuid는 stable stored identity다.
- alias는 존재할 때 human-facing runtime reference다.
- `aliasOrId` behavior는 compatibility의 일부다.

Invisible component는 DOM에 mount되지 않았더라도 runtime에서는 component object로 남아야 한다.

## PluginPointer

Plugin pointer data는 plugin name과 payloads를 저장한다. Plugin directory/type은 owning model이 결정한다.

Older plugin pointer가 자체 type을 저장하지 않기 때문에, 새 plugin type 작업은 pointer data에 type field가 있어야 한다고 요구하면 안 된다.

## Runtime Plugin Config

Runtime plugin configuration은 optional project config다. Runtime plugin config가 없는 project는 old project처럼 동작해야 한다.

Config가 있으면 runtime plugin name과 optional payloads/attributes를 식별한다. Missing 또는 disabled entry는 안전하게 무시한다.

## Guidance

- Field는 default와 함께 추가한다.
- Old payload meaning을 유지한다.
- 명시적 설계 없이 runtime state를 saved data에 넣지 않는다.
- Plugin directory compatibility를 유지한다.
- Plugin control API를 추가할 때 schema change보다 play/runtime adapter를 선호한다.
