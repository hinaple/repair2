<script lang="ts">
  import { genId } from "@shared/genId";
  import Menu from "../../menu/Menu.svelte";
  import { closeContextMenu, contextMenu } from "./contextUtils";

  const anchorName = `--context-menu-${genId()}`;
</script>

{#if $contextMenu}
  <div
    class="context-anchor"
    style={`--a: ${anchorName}; left: ${$contextMenu.position.x}px; top: ${$contextMenu.position.y}px;`}
  ></div>
  <Menu
    items={$contextMenu.items}
    parents={[]}
    {anchorName}
    width="150px"
    initialActive="none"
    pointerActive="hover"
    collapse={closeContextMenu}
  />
{/if}

<style>
  .context-anchor {
    position: fixed;
    width: 0;
    height: 0;
    anchor-name: var(--a);
    pointer-events: none;
  }
</style>
