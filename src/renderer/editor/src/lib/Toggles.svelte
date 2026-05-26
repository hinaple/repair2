<script>
    import ToggleIcon from "./ToggleIcon.svelte";

    let { toggles, style = "" } = $props();
</script>

<div class="toggles" {style}>
    {#each toggles as toggle}
        <ToggleIcon {...toggle} />
    {/each}
</div>

<style>
    .toggles {
        justify-content: end;
        display: flex;
        flex-direction: row;
        flex: 0 0 auto;
        gap: 3px;
        padding: 3px;
        border-radius: 8px;
        background-color: rgba(0, 0, 0, 0.2);
        margin-inline: auto 0px;
        box-sizing: border-box;
    }
</style>
