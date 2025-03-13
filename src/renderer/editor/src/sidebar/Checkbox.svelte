<script>
    import { draw } from "svelte/transition";

    let { value, onclick } = $props();
</script>

<div class="checkbox" {onclick}>
    {#if value}
        <svg
            class="inner"
            xmlns="http://www.w3.org/2000/svg"
            width="6"
            height="5"
            fill="none"
            viewBox="0 0 6 5"
        >
            <path stroke="#000" d="m1 2 1.5 1.5L5 1" transition:draw={{ duration: 200 }} />
        </svg>
    {/if}
</div>

<style>
    .checkbox {
        width: 20px;
        height: 20px;
        background-color: #fff;
        position: relative;
        cursor: pointer;
        border: solid #000 1px;
        box-sizing: border-box;
    }
    .inner {
        width: 100%;
        height: auto;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        transition: all 200ms ease;
    }
</style>
