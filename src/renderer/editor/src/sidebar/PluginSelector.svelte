<script>
    import { getPluginList } from "@classes/utils";
    import { addHistory } from "../lib/workHistory";
    import InputField from "./InputField.svelte";

    let { plugin, type } = $props();

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
        <option value={"null"} selected>선택 안함</option>
        {#await getPluginList(true) then pluginList}
            {#each pluginList[type] as pluginName}
                <option value={pluginName}>{pluginName.replace(/\.js$/, "")}</option>
            {/each}
        {/await}
    </select>
    {#key plugin.name}
        {#if plugin.name && plugin.name !== "null" && plugin.imported && plugin.attributes?.length}
            {#each plugin.attributes as attr}
                <InputField
                    label={attr}
                    value={plugin.payloads[attr]}
                    setter={(d) => (plugin.payloads[attr] = d)}
                    row
                    small
                />
            {/each}
        {/if}
    {/key}
</div>

<style>
    .plugin-select {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    select {
        padding: 2px 5px;
        border: none;
        background-color: #fff;
        font-family: "Pretend";
        font-size: 20px;
        color: #000;
        font-weight: 600;
        margin-bottom: 10px;
    }
</style>
