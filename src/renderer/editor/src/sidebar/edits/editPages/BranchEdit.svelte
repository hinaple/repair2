<script lang="ts">
  import InputField from "../../input/InputField.svelte";
  import { ComparisonOperatorTypes } from "../../../lib/translate";
  import type { Types } from "@shared/projectData/types";
  import type { RecordEditor } from "../../../project/mutator";
  const { editor }: { editor: RecordEditor<"nodes", Types.Branch> } = $props();
  let data = $derived(editor.value);
</script>

<InputField label="분기점 이름" binding={editor.field("alias")} />
<InputField
  label="비교 연산자"
  type="select"
  options={ComparisonOperatorTypes}
  value={data.operator}
  oncommit={(operator: Types.Branch["operator"]) => {
    editor.set({ ...data, operator, scriptData: null });
  }}
/>
{#if data.operator === "jsFunction"}
  <InputField
    label="콜백 함수 코드"
    binding={editor.field("scriptData")}
    type="textarea"
    code
    placeholder="return valueA === valueB"
    autoResizeOpt={{ minHeight: 50 }}
  />
{/if}
<InputField
  label="'참' 발동 이후 비활성화"
  type="checkbox"
  binding={editor.field("disableAfterTrue")}
/>
<InputField
  label="'거짓' 발동 이후 비활성화"
  type="checkbox"
  binding={editor.field("disableAfterFalse")}
/>
