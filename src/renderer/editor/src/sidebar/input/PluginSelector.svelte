<script>
    import { addHistory } from "../../lib/workHistory";
    import Attributes from "./Attributes.svelte";
    import { plugins } from "../../lib/plugins.svelte";
    import InputField from "./InputField.svelte";

    let { plugin, type, canUnselect = true } = $props();
</script>

<div class="plugin-select">
    <InputField
        type="select"
        options={Object.keys(plugins[type])}
        value={plugin.name}
        setter={(v) => (plugin.name = v)}
        canUnselect
    />
    {#if plugin.name && plugins[type][plugin.name]}
        {@const currentPlugin = plugins[type][plugin.name]}
        {@const exportKeys = Object.keys(currentPlugin.exports)}
        {#if !(exportKeys.length === 1 && exportKeys[0] === "default")}
            <InputField
                type="select"
                options={exportKeys}
                value={plugin.exportName}
                setter={(v) => (plugin.exportName = v || "default")}
            />
        {/if}
        {#if currentPlugin.exports[plugin.exportName ?? "default"]}
            <Attributes
                attributes={currentPlugin.exports[plugin.exportName ?? "default"]}
                {plugin}
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
