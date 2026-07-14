<script lang="ts">
  import InputField from "../../../input/InputField.svelte";
  import type { RecordEditor } from "../../../../project/mutator";
  const { editor }: { editor: RecordEditor<"steps"> } = $props();
  let data = $derived(editor.value);
  let operation = $derived(data.type.split(".")[1]);
</script>

{#if operation}
  <InputField label="채널명" binding={editor.at("payload", "channel")} placeholder="default" />
{/if}
{#if operation === "play"}
  <InputField
    label="재생할 오디오 자원"
    binding={editor.at("payload", "resourceId")}
    type="resource"
    elType="audio"
  />
  <InputField label="반복 재생" binding={editor.at("payload", "loop")} type="checkbox" />
  <InputField
    label="음량"
    binding={editor.at("payload", "volume")}
    type="number"
    placeholder="0-100"
    min="0"
    max="100"
  />
{:else if operation === "changeVolume"}
  <InputField
    label="변경할 음량"
    binding={editor.at("payload", "volume")}
    type="number"
    placeholder="0-100"
    min="0"
    max="100"
  />
  <InputField
    label="변화 시간(초)"
    binding={editor.at("payload", "duration")}
    type="number"
    min="0"
  />
{/if}
