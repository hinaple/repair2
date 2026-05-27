<script>
    /** @typedef {import("@fainthit/repair2-plugin-sdk").ElementContext} ElementContext */
    /** @typedef {{
     *   attributes?: Record<string, unknown>,
     *   ctx: ElementContext,
     *   root: HTMLElement,
     *   dispatchEvent: (type: string, event?: unknown) => void
     * }} Props */

    /** @type {Props} */
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
