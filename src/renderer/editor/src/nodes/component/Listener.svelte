<script lang="ts">
  import Icon from "../../assets/icons/Icon.svelte";
  import { ElementListenerTypes } from "../../lib/translate";
  import outputNode from "../lines/output";
  import type { SortableProps } from "../types";
  import { getProject } from "../../project/store";
  import { data } from "../../lib/editUtils/dataAction";

  let {
    id,
    onpointerdown,
    hidden = false,
    parents
  }: SortableProps & {
    hidden?: boolean;
    parents: string[];
  } = $props();

  const getId = () => id;

  const listener = getProject().getUnsafe("listeners", getId());
</script>

<div class="listener">
  <div use:data={{ type: "listener", id, parents }} class="container">
    <div class="handle" {onpointerdown}>
      <Icon icon="hamburger" color="rgba(255, 255, 255, 0.5)" size={8} />
    </div>
    <div class="title">
      {(listener.payload as any)?.channel?.trim?.() || ElementListenerTypes[listener.type]}
    </div>
    {#if !hidden}
      <div class="output" use:outputNode={{ id, data: listener }}></div>
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
