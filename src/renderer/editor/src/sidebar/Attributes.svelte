<script>
    import InputField from "./InputField.svelte";

    let { attributes, plugin } = $props();
</script>

{#if attributes.length}
    <div class="attributes">
        {#each attributes as attr}
            <InputField
                type="textarea"
                autoResizeOpt={{ minHeight: 0 }}
                label={attr}
                value={plugin.payloads[attr]}
                setter={(d) => (plugin.payloads[attr] = d)}
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
        padding: 10px 10px 12px 10px;
        background-color: rgba(255, 255, 255, 0.2);
    }
</style>
