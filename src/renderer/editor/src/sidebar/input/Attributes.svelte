<script lang="ts">
  import type { FieldBinding } from "../../project/mutator";
  import InputField from "./InputField.svelte";

  let {
    attributes,
    binding
  }: { attributes: string[]; binding: FieldBinding<Record<string, string>> } = $props();
</script>

{#if attributes.length}
  <div class="attributes">
    {#each attributes as attr}
      <InputField
        type="textarea"
        autoResizeOpt={{ minHeight: 0 }}
        label={attr}
        binding={binding.at(attr)}
        row
        small
      />
    {/each}
  </div>
{/if}

<style>
  .attributes {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 10px 12px;
    border-radius: 5px;
    border: solid var(--w-o2) 1px;
  }
</style>
