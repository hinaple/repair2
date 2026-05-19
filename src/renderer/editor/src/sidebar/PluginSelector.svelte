<script>
    import { addHistory } from "../lib/workHistory";
    import Attributes from "./Attributes.svelte";
    import { plugins } from "../lib/plugins.svelte";

    let { plugin, type, canUnselect = true } = $props();

    function onchange(evt) {
        addHistory({
            doFn: ({ pluginName, that }) => {
                that.setName(pluginName);
            },
            doData: { pluginName: evt.target.value, that: plugin },
            undoData: { pluginName: plugin.name, that: plugin }
        });
    }
</script>

<div class="plugin-select">
    <select value={plugin.name} {onchange}>
        <option value={null} selected hidden={!canUnselect}>선택 안함</option>
        {#each Object.keys(plugins.plugins[type]) as pluginName}
            <option value={pluginName}>{pluginName}</option>
        {/each}
    </select>
    {#key plugin.name}
        {@const currentPlugin = plugins.plugins[type][plugin.name]}
        {#if plugin.name && currentPlugin && currentPlugin.attributes?.length}
            <Attributes attributes={currentPlugin.attributes} {plugin} />
        {/if}
    {/key}
</div>

<style>
    .plugin-select {
        width: 100%;
        display: flex;
        flex-direction: column;
    }
    select {
        padding: 2px 5px;
        border: none;
        background-color: #fff;
        font-family: "Pretend";
        font-size: 20px;
        color: #000;
        font-weight: 600;
    }
</style>
