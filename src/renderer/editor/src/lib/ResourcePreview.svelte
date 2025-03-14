<script>
    import { getAssetDir } from "@classes/utils";

    let { resource, controls = true } = $props();
</script>

{#if resource.src}
    <div class={["preview", resource.fileType === "image" && "image"]}>
        {#if resource.fileType === "image"}
            <img src={getAssetDir(resource.src)} />
        {:else if resource.fileType === "video"}
            <video src={getAssetDir(resource.src)} {controls} muted></video>
        {:else if resource.fileType === "audio"}
            <audio src={getAssetDir(resource.src)} controls></audio>
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
    img {
        background: repeating-conic-gradient(#e7e7e7 0% 25%, #bababa 0% 50%) 50% / 10px 10px;
    }
    img,
    video {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
    }
    audio {
        width: 100%;
    }
</style>
