<script>
    import { getAssetDir } from "@renderer/utils";
    import { onDestroy } from "svelte";

    let { resource, controls = true, small = false } = $props();

    /** @type {HTMLMediaElement} */
    let mediaEl = $state(null);

    onDestroy(() => {
        if (!mediaEl) return;
        mediaEl.src = "";
        mediaEl.remove();
        mediaEl.srcObject = null;
    });
</script>

{#if resource.src}
    <div class={["preview", small && "small", resource.fileType]}>
        {#if resource.fileType === "image"}
            <img src={getAssetDir(resource.src)} />
        {:else if resource.fileType === "video"}
            <video bind:this={mediaEl} src={getAssetDir(resource.src)} {controls} muted></video>
        {:else if resource.fileType === "audio"}
            <audio bind:this={mediaEl} src={getAssetDir(resource.src)} controls></audio>
        {/if}
    </div>
{/if}

<style>
    .preview {
        max-width: 100%;
        height: 100%;
        flex: 1 1 auto;
        display: flex;
        align-items: center;
    }
    .preview.small {
        min-width: 60px;
        flex-basis: 100px;
    }
    .preview.small.audio {
        width: 50%;
        flex: 0 0 auto;
        audio {
            width: 100%;
            height: 50%;
        }
    }
    img {
        background: repeating-conic-gradient(#e7e7e7 0% 25%, #bababa 0% 50%) 50% / 10px 10px;
    }
    img,
    video {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        box-sizing: border-box;
        border: dashed #ffffff 1px;
    }
</style>
