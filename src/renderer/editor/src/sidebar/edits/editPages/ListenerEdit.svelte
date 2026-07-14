<script lang="ts">
  import InputField from "../../input/InputField.svelte";
  import { ElementListenerTypes } from "../../../lib/translate";
  import type { RecordEditor } from "../../../project/mutator";

  const { editor }: { editor: RecordEditor<"listeners"> } = $props();
  let data = $derived(editor.value);
</script>

<InputField
  label="리스너 종류"
  type="type"
  binding={editor}
  typeName="listener"
  options={ElementListenerTypes}
/>
{#if data.type === "custom" || data.type === "jsFunction" || data.type === "plugin"}
  <hr />
  <InputField label="이벤트 채널명" binding={editor.at("payload", "channel")} />
{/if}
{#if data.type === "keyPress"}
  <hr />
  <InputField
    label="감지할 버튼(콤마로 구분)"
    binding={editor.at("payload", "key")}
    placeholder="모든 키 감지"
  />
{/if}
{#if data.type === "jsFunction"}
  <InputField
    label="콜백 함수 코드"
    binding={editor.at("payload", "scriptData")}
    type="textarea"
    code
    placeholder="event 객체 사용 가능\ntrue 반환 시 활성화"
    autoResizeOpt={{ minHeight: 50 }}
  />
{:else if data.type === "Drag.released"}
  <hr />
  <InputField
    label="인식할 좌표(0부터 시작, 콤마로 구분)"
    binding={editor.at("payload", "hotspotIndexes")}
    placeholder="항상 발동"
  />
{:else if data.type === "plugin"}
  <InputField
    label="플러그인"
    binding={editor.at("payload", "plugin")}
    type="plugin"
    pluginType="function"
  />
{/if}

<hr />
<InputField label="발동 반복 횟수" binding={editor.field("repeatCount")} type="number" min="1" />
{#if data.repeatCount > 1}
  <InputField
    label="최소 반복 감지 시간(ms)"
    binding={editor.field("repeatInterval")}
    type="number"
    min="0"
    placeholder="0 = 시간 제한 없음"
  />
{/if}
<InputField label="한 번만 실행" binding={editor.field("once")} type="checkbox" />
<InputField label="전역 실행" binding={editor.field("global")} type="checkbox" />
<InputField label="최우선 실행" binding={editor.field("useCapture")} type="checkbox" />
