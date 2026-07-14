<script lang="ts">
  import InputField from "../../input/InputField.svelte";
  import { BaseValueTypes } from "../../../lib/translate";
  import type { RecordEditor } from "../../../project/mutator";
  const { editor }: { editor: RecordEditor<"values"> } = $props();
  let data = $derived(editor.value);
</script>

<InputField
  label="기본값 종류"
  type="select"
  value={data.baseType}
  oncommit={(d: string) => {
    editor.set({ ...data, baseType: d, baseValue: null });
  }}
  options={BaseValueTypes}
/>
{#if data.baseType === "string"}
  <InputField label="기본값 직접 입력" binding={editor.field("baseValue")} />
{:else if data.baseType === "variable"}
  <InputField label="변수 할당" binding={editor.field("baseValue")} type="variable" />
{/if}
