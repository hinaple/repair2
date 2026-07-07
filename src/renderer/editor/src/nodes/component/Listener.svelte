<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import Icon from "../../assets/icons/Icon.svelte";
  import { outClicked, rightclick } from "../../lib/contextMenu/contextUtils";
  import { currentFocus, focusData } from "../../lib/editUtils/focus";
  import { get } from "svelte/store";
  import { grabbing } from "../../lib/stores";
  import { ElementListenerTypes } from "../../lib/translate";
  import outputNode from "../lines/output";
  import { genClipboardFn } from "../../lib/editUtils/clipboard";
  import type { SortableProps } from "../types";

  let {
    id,
    remove,
    onpointerdown,
    hidden = false
  }: SortableProps & {
    hidden: boolean;
  } = $props();
</script>

<div class="listener" bind:this={el}>
  <div
    class={["container", $currentFocus.obj === listener && "focus"]}
    use:rightclick={{ type: "listener", id }}
    onpointerdown={(evt) => {
      if (evt.button || $grabbing) return;
      evt.stopPropagation();
      focusData("listener", listener, { clipboardFn });
      outClicked();
    }}
  >
    <div class="handle" {onpointerdown}>
      <Icon icon="hamburger" color="rgba(255, 255, 255, 0.5)" size={8} />
    </div>
    <div class="title">
      {(listener.payload?.channel?.trim?.() || ElementListenerTypes[listener.type]) ?? "리스너"}
    </div>
    {#if !hidden}
      <div class="output" use:outputNode={listener}></div>
    {/if}
  </div>
</div>

<style>
  .listener {
    min-width: 100%;
    box-sizing: border-box;
    font-size: 12px;
    font-weight: 400;
    height: 25px;
    padding-left: 15px;
  }
  .container {
    position: relative;
    border-radius: 5px 0 0 5px;
    color: #fff;
    background-color: #000;
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .handle {
    box-sizing: border-box;
    padding-inline: 6px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
  }
  .title {
    flex: 1 1 auto;
  }
  .output {
    position: absolute;
    width: 14px;
    height: 14px;
    background-color: #000;
    right: -14px;
    border-radius: 0 7px 7px 0;
    cursor: grab;
  }
</style>
