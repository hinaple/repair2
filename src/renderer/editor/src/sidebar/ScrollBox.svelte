<script>
    import { onDestroy, onMount } from "svelte";
    import Grabber from "../lib/grabber";

    let { children } = $props();

    /** @type {HTMLDivElement} */
    let container,
        /** @type {HTMLDivElement} */
        scrollbar,
        grabber;

    let observer = new ResizeObserver((entries) => {
        if (!entries.length) return;
        const rect = entries[0].contentRect;
        console.log(rect);
    });
    onMount(() => {
        observer.observe(container);

        grabber = new Grabber({
            container: scrollbar,
            inNodeSpace: false,
            onMoved({ dy }) {
                console.log(dy);
                container.scrollBy(0, dy);
            }
        });
    });
    onDestroy(() => {
        observer.disconnect();
    });
</script>

<div class="scroll-zone">
    <div class="scroll-gutter">
        <div bind:this={scrollbar} class="scrollbar"></div>
    </div>
    <div bind:this={container} class="container">
        {@render children()}
    </div>
</div>

<style>
    .scroll-zone {
        width: 100%;
        height: 100%;
        position: relative;

        contain: paint layout size;
    }
    .scroll-zone::-webkit-scrollbar {
        display: none;
    }
    .scroll-gutter {
        position: fixed;
        top: 0;
        right: 0;
        width: 4px;
        height: 100%;
        padding: 3px;
        z-index: 2;
    }
    .scroll-gutter:hover {
        border-left: solid var(--w-o6) 1px;
    }
    .scrollbar {
        width: 100%;
        height: 50%;
        position: absolute;
        top: 0;
    }
    .container {
        width: 100%;
        height: 100%;
        overflow-y: auto;
    }
    .container::-webkit-scrollbar {
        display: none;
    }
    .container > :global(*) {
        overflow-y: visible;
    }
</style>
