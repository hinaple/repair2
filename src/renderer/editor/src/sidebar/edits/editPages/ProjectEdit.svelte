<script lang="ts">
  import { ScreenConfigTypes } from "../../../lib/translate";
  import { Factories } from "../../../project/factories";
  import { getMutator } from "../../../project/store";
  import type { ConfigEditor } from "../../../project/mutator";
  import InputField from "../../input/InputField.svelte";

  const { editor }: { editor: ConfigEditor } = $props();
  let data = $derived(editor.value);

  function addRuntimePlugin() {
    getMutator().transaction(() => {
      const id = Factories.pluginPointer();
      editor.field("runtimePlugins").splice(data.runtimePlugins.length, 0, id);
    });
  }
</script>

<InputField label="프로젝트 이름" binding={editor.field("title")} />
<hr />
<InputField label="화면 너비" binding={editor.field("width")} type="number" />
<InputField label="화면 높이" binding={editor.field("height")} type="number" />
<InputField label="확대 비율" binding={editor.field("sizeRatio")} placeholder="가로비율,세로비율" />
<InputField
  label="창 유형"
  type="type"
  binding={editor.field("screenConfig")}
  typeName="screenConfig"
  options={ScreenConfigTypes}
/>
{#if data.screenConfig.type === "windowMode"}
  <InputField
    label="창 X좌표(px)"
    type="number"
    binding={editor.at("screenConfig", "payload", "x")}
  />
  <InputField
    label="창 Y좌표(px)"
    type="number"
    binding={editor.at("screenConfig", "payload", "y")}
  />
{/if}
<hr />
<InputField
  label="화면 필터"
  binding={editor.field("filter")}
  type="textarea"
  code
  placeholder="css filter"
/>
<InputField
  label="CSS style"
  binding={editor.field("style")}
  type="textarea"
  code
  placeholder="inline CSS style"
/>
<InputField label="투명한 창" binding={editor.field("transparent")} type="checkbox" />
<hr />
<InputField
  label="런타임 플러그인"
  seriesOption={{ binding: editor.field("runtimePlugins"), create: addRuntimePlugin }}
  type="plugin"
  pluginType="runtime"
  canUnselect={false}
/>
<hr />
<InputField
  label="편집기 단축키"
  binding={editor.field("editorShortcut")}
  maxLength="1"
  placeholder="E"
/>
<InputField
  label="에디터 비밀번호"
  binding={editor.field("editorPassword")}
  placeholder="비밀번호 없음"
/>
<InputField label="창을 항상 최상위에 표시" binding={editor.field("alwaysOnTop")} type="checkbox" />
<InputField label="플러그인 HMR 활성화" binding={editor.field("devMode")} type="checkbox" />
<InputField
  label="시스템 키 비활성화"
  binding={editor.field("suppressGlobalKeys")}
  type="checkbox"
/>
