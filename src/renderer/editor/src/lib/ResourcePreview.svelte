<script>
    let { resource } = $props();
</script>

{#if resource.src}
    <div class="preview">
        {#if resource.fileType === "image"}
            <img src={"asset://" + resource.src} />
        {:else if resource.fileType === "video"}
            <video src={"asset://" + resource.src} controls></video>
        {/if}
    </div>
{/if}

<style>
    .preview {
        width: 100%;
        max-height: 200px;
    }
    img,
    video {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
    }
</style>
