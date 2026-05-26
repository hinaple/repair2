<script>
    let { root, dispatchEvent, ctx } = $props();

    const pluginLabel = ctx ? `${ctx.plugin.id} (${ctx.plugin.type})` : "No context";
</script>

<div class="plugin-container">
    <h1>Hello World!</h1>
    <p>{pluginLabel}</p>
</div>

<style>
    .plugin-container {
        background: #222;
        color: #fff;
        padding: 10px;
        border-radius: 8px;
    }
</style>
