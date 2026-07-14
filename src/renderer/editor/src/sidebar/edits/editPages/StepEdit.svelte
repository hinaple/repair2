<script lang="ts">
  import { focusData } from "../../../lib/editUtils/focus";
  import { StepTypes } from "../../../lib/translate";
  import InputField from "../../input/InputField.svelte";
  import Audios from "./stepEdits/Audios.svelte";
  import Communications from "./stepEdits/Communications.svelte";
  import Components from "./stepEdits/Components.svelte";
  import Preloads from "./stepEdits/Preloads.svelte";
  import RuntimePluginStep from "./stepEdits/RuntimePluginStep.svelte";
  import type { RecordEditor } from "../../../project/mutator";

  const { editor }: { editor: RecordEditor<"steps"> } = $props();
  let data = $derived(editor.value);
  let typeParts = $derived(data.type.split("."));

  function typeChanged() {
    const current = editor.value;
    if (current.type === "Component.create" && current.payload.componentId)
      focusData("component", current.payload.componentId, [editor.id]);
  }
</script>

<InputField label="스텝 이름" binding={editor.field("title")} />
<InputField
  label="스텝 유형"
  type="type"
  binding={editor}
  typeName="step"
  options={StepTypes}
  onchange={typeChanged}
/>
<hr />
{#if typeParts[0] === "Component"}
  <Components {editor} />
{:else if typeParts[0] === "Audio"}
  <Audios {editor} />
{:else if typeParts[0] === "Preload"}
  <Preloads {editor} />
{:else if typeParts[0] === "Communication"}
  <Communications {editor} />
{:else if data.type === "delay"}
  <InputField label="딜레이(ms)" binding={editor.at("payload", "delayMs")} type="number" min="0" />
{:else if data.type === "Others.customReset"}
  <InputField label="음향 초기화" binding={editor.at("payload", "audios")} type="checkbox" />
  <InputField label="변수 초기화" binding={editor.at("payload", "variables")} type="checkbox" />
  <InputField
    label="컴포넌트 전체 삭제"
    binding={editor.at("payload", "components")}
    type="checkbox"
  />
  <InputField label="스텝 초기화" binding={editor.at("payload", "steps")} type="checkbox" />
  <InputField label="프리로드 초기화" binding={editor.at("payload", "preloads")} type="checkbox" />
  <InputField
    label="활성 진입점 초기화"
    binding={editor.at("payload", "entries")}
    type="checkbox"
  />
  <InputField
    label="런타임 플러그인 초기화"
    binding={editor.at("payload", "runtimePlugins")}
    type="checkbox"
  />
{:else if data.type === "Others.eventEmit"}
  <InputField label="이벤트 채널" binding={editor.at("payload", "channel")} />
  <InputField label="데이터" binding={editor.at("payload", "data")} type="textarea" />
{:else if data.type === "Others.setVariable"}
  <InputField label="수정할 변수" binding={editor.at("payload", "variableId")} type="variable" />
  <InputField label="수정할 값" binding={editor.at("payload", "value")} />
{:else if data.type === "Others.executePlugin"}
  <InputField
    label="플러그인"
    binding={editor.at("payload", "plugin")}
    type="plugin"
    pluginType="function"
    canUnselect={false}
  />
  <InputField
    label="끝날 때까지 기다리기"
    binding={editor.at("payload", "waitTillEnd")}
    type="checkbox"
  />
{:else if data.type === "Others.runtimePluginStep"}
  <RuntimePluginStep {editor} />
{:else if data.type === "Others.script"}
  <InputField
    label="스크립트 코드"
    binding={editor.at("payload", "code")}
    type="textarea"
    code
    placeholder="//Enter JS script"
    autoResizeOpt={{ minHeight: 100 }}
  />
{:else if data.type === "Others.log"}
  <InputField label="로그 내용" binding={editor.at("payload", "content")} type="textarea" />
{/if}
