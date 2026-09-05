<script lang="ts">
  import Icon from "../../assets/icons/Icon.svelte";
  import { data } from "../../lib/editUtils/dataAction";
  import { grabbing } from "../../lib/stores";
  import { ValueProcessTypes } from "../../lib/translate";
  import { getMutator } from "../../project/store";
  import type { SortableProps } from "../types";

  let { id, onpointerdown, parents }: SortableProps & { parents: string[] } = $props();
  const editor = $derived(getMutator().record("valueProcesses", id));
  const valueProcess = $derived(editor.value);
</script>

<div
  class="value-process"
  onpointerdown={(event) => {
    if (event.button || $grabbing) return;
    onpointerdown(event);
  }}
  use:data={{ type: "valueProcess", id, parents }}
>
  <div class="info">
    <div class="handle"><Icon icon="hamburger" color="rgba(0,0,0,.5)" size={8} /></div>
    <span>{ValueProcessTypes[valueProcess.type as keyof typeof ValueProcessTypes] ?? "?"}</span>
  </div>
</div>

<style>
  .value-process {
    min-width: 100%;
    font-weight: 600;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
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
  .info {
    height: 30px;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
</style>
