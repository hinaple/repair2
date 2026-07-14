<script lang="ts">
  import { grabbing, reload } from "../../lib/stores";
  import { focusData } from "../../lib/editUtils/focus";
  import Icon from "../../assets/icons/Icon.svelte";
  import Sortable from "../Sortable.svelte";
  import Element from "./Element.svelte";
  import { startMonitoring } from "../../lib/runtimeMonitor.svelte";
  import { getMutator } from "../../project/store";
  import { Factories } from "../../project/factories";
  import { data } from "../../lib/editUtils/dataAction";
  import { onDestroy } from "svelte";

  let {
    id,
    noGrab = false,
    onNodeCountChanged,
    parents
  }: {
    id: string;
    noGrab?: boolean;
    onNodeCountChanged: () => unknown;
    parents: string[];
  } = $props();

  // svelte-ignore state_referenced_locally
  const myParents = [id, ...parents];

  const editor = $derived(getMutator().record("components", id));
  const comp = $derived(editor.value);

  $effect(() => {
    comp.alias;
    reload("nodeMoved");
  });

  function addElement(evt: PointerEvent) {
    if (evt.button || $grabbing) return;
    evt.stopPropagation();
    focusData(
      "element",
      getMutator().transaction(() => {
        const newId = Factories.element();
        editor.field("elements").splice(comp.elements.length, 0, newId);
        reload("nodeMoved");
        return newId;
      }),
      myParents
    );
  }

  let activated = $state(false);
  const unsub = startMonitoring("components", comp.id, (status) => (activated = status));
  onDestroy(unsub);
</script>

<div class={["component", activated && "activated"]} use:data={{ type: "component", id, parents }}>
  <div class="head">
    <span>
      {comp.alias?.length ? comp.alias : "이름 없는 컴포넌트"}
    </span>
    <div class="add" onpointerdown={addElement}>
      <Icon lineWidth={2} size={7} />
    </div>
  </div>
  <div class="elements">
    <Sortable
      binding={editor.field("elements")}
      itemType="elements"
      onresized={() => reload("nodeMoved")}
      onmoved={() => reload("nodeMoved")}
      style="enum"
      {noGrab}
    >
      {#snippet children(props)}
        <Element parents={myParents} {onNodeCountChanged} {...props} />
      {/snippet}
    </Sortable>
  </div>
</div>

<style>
  .component {
    width: 100%;
    box-sizing: border-box;
    background-color: var(--b-o2);
  }
  .component.activated {
    background-color: rgba(228, 112, 45, 0.6);
  }
  .head {
    padding-left: 10px;
    height: 25px;
    font-size: 12px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .add {
    flex: 0 0 auto;
    width: 25px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .add:hover {
    background-color: var(--b-o1);
  }
</style>
