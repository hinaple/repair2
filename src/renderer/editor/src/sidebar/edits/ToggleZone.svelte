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
        margin-bottom: 20px;
        border: solid transparent 1px;

        transition: border-color 200ms;
    }
    .toggle-label:not(.folded) {
        margin-bottom: 0;
        border-color: #fff #fff transparent #fff;
    }
    .toggle-label.folded:hover {
        border-color: #fff;
    }
    .bottom {
        width: 100%;
        height: 5px;
        background-color: rgba(255, 255, 255, 0.2);
        flex: 0 0 auto;
        margin-bottom: 20px;
        border: solid 1px;
        border-color: transparent #fff #fff #fff;
    }
</style>
