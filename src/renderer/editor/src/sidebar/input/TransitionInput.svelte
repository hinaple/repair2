<script lang="ts">
  import type { FieldBinding } from "../../project/mutator";
  import InputField from "./InputField.svelte";
  import PluginSelector from "./PluginSelector.svelte";

  let { binding }: { binding: FieldBinding<any> } = $props();
  let transition = $derived(binding.value);
</script>

<div class="transition-input">
  <PluginSelector binding={binding.at("plugin")} type="transition" />
  <InputField
    label="지속시간(ms)"
    binding={binding.at("duration")}
    type="number"
    placeholder={400}
    row
    small
  />
  <InputField
    label="딜레이(ms)"
    binding={binding.at("delay")}
    type="number"
    placeholder={0}
    row
    small
  />
  <InputField label="easing" binding={binding.at("easing")} placeholder="linear" row small />
</div>

<style>
  .transition-input {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 10px;
  }
</style>
