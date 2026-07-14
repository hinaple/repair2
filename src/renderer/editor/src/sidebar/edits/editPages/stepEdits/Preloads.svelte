<script lang="ts">
  import InputField from "../../../input/InputField.svelte";
  import type { RecordEditor } from "../../../../project/mutator";
  const { editor }: { editor: RecordEditor<"steps"> } = $props();
  let operation = $derived(editor.value.type.split(".")[1]);
</script>

{#if operation === "add" || operation === "release"}
  <InputField
    label="자원 목록"
    type="resource"
    seriesOption={{ binding: editor.at("payload", "resourceArr") }}
  />
{/if}
