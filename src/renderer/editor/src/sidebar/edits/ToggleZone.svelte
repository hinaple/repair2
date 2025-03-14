<script>
    import FoldArrow from "../../lib/FoldArrow.svelte";

    let { folded = $bindable(true), label = null, children } = $props();
</script>

<div class={["toggle-label", folded && "folded"]} onclick={() => (folded = !folded)}>
    <span>{label}</span>
    <FoldArrow {folded} />
</div>
{#if !folded}
    {@render children()}
    <div class="bottom"></div>
{/if}

<style>
    .toggle-label {
        width: 100%;
        padding: 10px 5px 10px 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        box-sizing: border-box;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 10px 10px 0 0;
    }
    .toggle-label.folded {
        border-radius: 10px;
        margin-bottom: 20px;
    }
    .bottom {
        width: 100%;
        height: 20px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 0 0 10px 10px;
        flex: 0 0 auto;
        margin-bottom: 20px;
    }
</style>
