<script lang="ts">
  import type { Props } from "./props.types";

  let { root, ctx, slot }: Props = $props();

  let pluginLabel = $derived(ctx ? `${ctx.plugin.id} (${ctx.plugin.type})` : "No context");
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
