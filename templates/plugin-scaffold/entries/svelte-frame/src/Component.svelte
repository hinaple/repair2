<script>
    /** @typedef {import("@fainthit/repair2-plugin-sdk").FrameContext} FrameContext */
    /** @typedef {{
     *   attributes?: Record<string, unknown>,
     *   ctx: FrameContext,
     *   root: HTMLElement,
     *   slot: (node: HTMLElement) => void
     * }} Props */

    /** @type {Props} */
    let { root, ctx, slot } = $props();

    const pluginLabel = ctx ? `${ctx.plugin.id} (${ctx.plugin.type})` : "No context";
</script>

<div class="frame-container">
    <div class="title">{pluginLabel}</div>
    <div class="body" use:slot></div>
</div>

<style>
    .frame-container {
        background: red;
        color: #fff;
        padding: 10px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
    }
    .title {
        width: 100%;
        flex: 0 0 auto;
    }
</style>
