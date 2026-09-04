<script lang="ts">
  import InputField from "../../input/InputField.svelte";
  import { ValueProcessTypes } from "../../../lib/translate";
  import type { RecordEditor } from "../../../project/mutator";

  const { editor }: { editor: RecordEditor<"valueProcesses"> } = $props();
  let data = $derived(editor.value);
</script>

<InputField
  label="처리 형태"
  type="type"
  binding={editor}
  typeName="valueProcess"
  options={ValueProcessTypes}
/>
<hr />
{#if data.type === "replaceAll"}
  <InputField label="변경 전 문자열" binding={editor.at("payload", "from")} />
  <InputField label="대체할 문자열" binding={editor.at("payload", "to")} />
{:else if data.type === "removeAll"}
  <InputField label="삭제할 문자열" binding={editor.at("payload", "removing")} />
{:else if data.type === "replaceAllRegex"}
  <InputField label="정규표현식" binding={editor.at("payload", "regex")} />
  <InputField
    label="대체할 문자열"
    binding={editor.at("payload", "to")}
    placeholder="$&, $1 등 패턴 사용 가능"
  />
{:else if data.type === "jsFunction"}
  <InputField
    label="함수"
    binding={editor.at("payload", "scriptData")}
    type="textarea"
    placeholder="return value;"
    autoResizeOpt={{ minHeight: 50 }}
    code
  />
{/if}
