<script lang="ts">
  import { onDestroy } from "svelte";
  import Icon from "../../assets/icons/Icon.svelte";
  import { outClicked, rightclick } from "../../lib/editUtils/contextMenu/contextUtils";
  import { currentFocus, focusData } from "../../lib/editUtils/focus";
  import { get } from "svelte/store";
  import { grabbing, reload } from "../../lib/stores";
  import { ElementTypes } from "../../lib/translate";
  import Sortable from "../Sortable.svelte";
  import Listener from "./Listener.svelte";
  import { addHistory } from "../../lib/editUtils/history";
  import registerHighlight, { type HighlightData } from "../../lib/highlight";
  import type { SortableProps } from "../types";
  import { getsetFrom, SortableUtils } from "../../lib/editUtils/sortable";
  import { createListener } from "@shared/projectData/factories";
  import { getProject } from "../../project/store";
  import { data } from "../../lib/editUtils/dataAction";

  let {
    id,
    noGrab = false,
    onpointerdown,
    onNodeCountChanged,
    parents
  }: SortableProps & {
    onNodeCountChanged: () => unknown;
    parents: string[];
  } = $props();

  // svelte-ignore state_referenced_locally
  const myParents = [id, ...parents];

  // svelte-ignore state_referenced_locally
  const element = getProject().getUnsafe("elements", id);

  function addListener(evt: PointerEvent) {
    if (evt.button || $grabbing) return;
    evt.stopPropagation();
    const temp = createListener();
    SortableUtils.appendWithHistory(getsetFrom(element, "listeners"), temp.id);
    focusData("listener", temp.id, myParents);
  }

  let hlData = $derived.by<HighlightData>(() => {
    if (element.type === "input")
      return element.payload.variableId
        ? { type: "variable", data: element.payload.variableId }
        : null;
    if (element.type === "image" || element.type === "video")
      return element.payload.resourceId
        ? { type: "resource", data: element.payload.resourceId }
        : null;
    if (element.type === "plugin") {
      const pluginName = getProject().getUnsafe("pluginPointers", element.payload.plugin).name;
      return pluginName
        ? {
            type: "plugin",
            data: pluginName
          }
        : null;
    }
  });
</script>

<div class="element" use:data={{ type: "element", id, parents }} use:registerHighlight={hlData}>
  <div class="info">
    <div class="handle" {onpointerdown}>
      <Icon icon="hamburger" color="rgba(0, 0, 0, 0.5)" size={8} />
    </div>
    <div class="title">
      {element.alias?.length ? element.alias : ElementTypes[element.type]}
    </div>
    <div class="add" onpointerdown={addListener}>
      <Icon icon="arrow" size={9} lineWidth={1.5} />
    </div>
  </div>
  <div class="listeners">
    <Sortable
      key="listeners"
      parent={element}
      style="listener"
      onresized={() => reload("nodeMoved")}
      onmoved={() => reload("nodeMoved")}
      {noGrab}
      onremoved={onNodeCountChanged}
    >
      {#snippet children(props)}
        <Listener parents={myParents} {...props} />
      {/snippet}
    </Sortable>
  </div>
</div>

<style>
  .element {
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
    font-size: 12px;
    height: 25px;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .title {
    flex: 1 1 auto;
  }
  .add {
    height: 100%;
    width: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    cursor: pointer;
  }
  .add:hover {
    background-color: var(--b-o1);
  }
</style>
