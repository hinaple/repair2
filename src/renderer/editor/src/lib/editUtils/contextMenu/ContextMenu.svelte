<script lang="ts">
  import { contextMenu, itemClicked, outClicked } from "./contextUtils";

  let menuEl: HTMLElement | undefined = $state();

  $effect(() => {
    if (!menuEl || !$contextMenu) return;
    menuEl.style.left = `${$contextMenu.pos.x}px`;
    menuEl.style.top = `${$contextMenu.pos.y}px`;
  });
  function onpointerdown(evt: PointerEvent) {
    if ($contextMenu && menuEl && !evt.composedPath().includes(menuEl))
      outClicked();
  }
</script>

<svelte:body onpointerdowncapture={onpointerdown} />
{#if $contextMenu}
  <div class="context-menu" bind:this={menuEl}>
    {#each $contextMenu.items as item}
      {#if item.type === "separator"}
        <div class="separator"></div>
      {:else}
        <div
          class="item"
          tabindex="0"
          onclick={() => itemClicked($contextMenu, item)}
          onkeydown={(evt) => {
            if (evt.key === " " || evt.key === "Enter") itemClicked($contextMenu, item);
          }}
        >
          {item.label}
        </div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    z-index: var(--contextmenu-z);
    background-color: #fff;
    box-shadow: var(--b-o3) 3px 3px 10px;
    border: solid #000 1px;
    display: flex;
    flex-direction: column;
    min-width: 150px;
    user-select: none;
    font-family: "Pretend";
    font-size: 16px;
    font-weight: 400;
    align-items: center;
  }
  .item {
    padding: 5px;
    width: 100%;
    box-sizing: border-box;
  }
  .item:hover,
  .item:focus {
    background-color: var(--b-o1);
  }
  .separator {
    width: 100%;
    height: 1px;
    margin-block: 5px;
    box-sizing: border-box;
    background-color: #000;
  }
</style>
