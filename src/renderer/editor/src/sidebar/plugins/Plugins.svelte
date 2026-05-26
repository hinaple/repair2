<script>
    import { PLUGIN_TYPES } from "@classes/utils.js";
    import { plugins } from "../../lib/plugins.svelte.js";
    import PluginPreview from "./PluginPreview.svelte";
</script>

<div class="plugins-container">
    {#each PLUGIN_TYPES as t}
        {@const arr = Object.values(plugins[t])}
        {#if arr.length}
            <div class="plugin-type">
                {t}
            </div>
            <div class="plugins">
                {#each arr.sort((pa, pb) => pa.name.localeCompare(pb.name)) as info}
                    <PluginPreview {info} />
                {/each}
            </div>
        {/if}
    {/each}
</div>

<style>
    .plugins-container {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        scrollbar-gutter: stable;
        padding-bottom: 30px;
    }
    .plugin-type {
        font-size: 14px;
        padding: 5px 0 0 8px;
        border-top: solid #fff 1px;
        color: #fff;
        opacity: 0.6;
        margin-top: 10px;
        flex: 0 0 auto;
    }
    .plugin-type:first-of-type {
        border-top: none;
        margin-top: 0;
    }
    .plugins {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 3px 5px 10px 5px;
        box-sizing: border-box;
        flex: 0 0 auto;
    }
</style>
