<script>
    import { PLUGIN_TYPES, plugins } from "../../lib/plugins.svelte";
    import PluginPreview from "./PluginPreview.svelte";
</script>

<div class="plugins">
    {#each PLUGIN_TYPES as t}
        {#each Object.values(plugins.plugins[t]) as info}
            <PluginPreview {info} />
        {/each}
    {/each}
</div>

<style>
    .plugins {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 3px;
        overflow-y: auto;
        scrollbar-gutter: stable;
        align-items: center;
        padding: 10px 1px 10px 5px;
    }
</style>
