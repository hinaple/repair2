<script lang="ts">
  import type { Props } from "./props.types";

  let { root, dispatchEvent, ctx }: Props = $props();

  let pluginLabel = $derived(ctx ? `${ctx.plugin.id} (${ctx.plugin.type})` : "No context");
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
