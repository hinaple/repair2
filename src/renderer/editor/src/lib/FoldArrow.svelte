<script>
    import { get } from "svelte/store";
    import { grabbing } from "./stores";

    let { folded = $bindable(false), toggle = null } = $props();
</script>

<div
    onclick={() => {
        if (get(grabbing)) return;
        folded = !folded;
        toggle?.();
    }}
    class:folded
>
    <svg width="14" height="7" viewBox="0 0 14 7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L6.5 6L12 1" />
    </svg>
</div>

<style>
    div {
        height: 100%;
        width: 36px;
        cursor: pointer;
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;

        transition: transform 200ms ease;
    }
    .folded {
        transform: rotate(-180deg);
    }
    svg {
        width: auto;
        height: 8px;
    }
    path {
        stroke: #fff;
        stroke-width: 2px;
    }
</style>
