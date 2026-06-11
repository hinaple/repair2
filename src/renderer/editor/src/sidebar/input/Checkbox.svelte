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
            <path stroke="#fff" d="m1 2 1.5 1.5L5 1" transition:draw={{ duration: 200 }} />
        </svg>
    {/if}
</div>

<style>
    .checkbox {
        width: 18px;
        height: 18px;
        background-color: var(--w-o2);
        position: relative;
        cursor: pointer;
        /* border: solid #000 1px; */
        box-sizing: border-box;
        border-radius: 5px;
    }
    .inner {
        width: 100%;
        height: auto;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        transition: all 200ms ease;

        path {
            stroke-width: 0.6px;
        }
    }
</style>
