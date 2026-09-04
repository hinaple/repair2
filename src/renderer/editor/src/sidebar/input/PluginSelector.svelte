<script lang="ts">
  import type { FieldBinding } from "../../project/mutator";
  import { getMutator } from "../../project/store";
  import { plugins } from "../../lib/plugins.svelte";
  import Attributes from "./Attributes.svelte";
  import InputField from "./InputField.svelte";

  let {
    binding,
    type,
    canUnselect = true
  }: {
    binding: FieldBinding<string>;
    type: keyof typeof plugins;
    canUnselect?: boolean;
  } = $props();

  let pluginId = $derived(binding.value);
  let editor = $derived(getMutator().record("pluginPointers", pluginId));
  let plugin = $derived(editor.value);
</script>

<div class="plugin-select">
  <InputField
    type="select"
    options={Object.keys(plugins[type] ?? {})}
    binding={editor.field("name")}
    {canUnselect}
  />
  {#if plugin.name && plugins[type]?.[plugin.name]}
    {@const currentPlugin = plugins[type][plugin.name]}
    {@const exportKeys = Object.keys(currentPlugin.exports)}
    {#if !(exportKeys.length === 1 && exportKeys[0] === "default")}
      <InputField type="select" options={exportKeys} binding={editor.field("exportName")} />
    {/if}
    {#if currentPlugin.exports[plugin.exportName ?? "default"]}
      <Attributes
        attributes={currentPlugin.exports[plugin.exportName ?? "default"] ?? []}
        binding={editor.field("payloads")}
      />
    {/if}
  {/if}
</div>

<style>
  .plugin-select {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
</style>
