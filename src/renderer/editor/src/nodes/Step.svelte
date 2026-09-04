<script lang="ts">
  import { onDestroy } from "svelte";
  import Icon from "../assets/icons/Icon.svelte";
  import { data } from "../lib/editUtils/dataAction";
  import registerHighlight, { type HighlightData } from "../lib/highlight";
  import { startMonitoring } from "../lib/runtimeMonitor.svelte";
  import { reload } from "../lib/stores";
  import { StepTypes } from "../lib/translate";
  import { getMutator } from "../project/store";
  import type { SortableProps } from "./types";
  import Component from "./component/Component.svelte";

  let {
    id,
    onpointerdown,
    noGrab = false,
    parents
  }: SortableProps & { parents: string[] } = $props();

  const editor = $derived(getMutator().record("steps", id));
  const step = $derived(editor.value);

  $effect(() => {
    step.type;
    step.title;
    reload("nodeMoved");
  });

  let hlData = $derived.by<HighlightData>(() => {
    if (step.type === "Others.setVariable")
      return step.payload.variableId ? { type: "variable", data: step.payload.variableId } : null;
    if (step.type === "Others.executePlugin") {
      const name = getMutator().record("pluginPointers", step.payload.plugin).value.name;
      return name ? { type: "plugin", data: name } : null;
    }
    if (step.type === "Others.runtimePluginStep")
      return step.payload.pluginName ? { type: "plugin", data: step.payload.pluginName } : null;
    return null;
  });

  let activated = $state(false);
  const unsubscribe = startMonitoring("steps", id, (value) => (activated = value));
  onDestroy(unsubscribe);
</script>

<div
  class={["step", activated && "activated"]}
  use:data={{ type: "step", id, parents }}
  use:registerHighlight={hlData}
>
  <div class="info">
    <div class="handle" {onpointerdown}>
      <Icon
        icon="hamburger"
        color={activated ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.5)"}
        size={8}
      />
    </div>
    <div class="title-wrapper">
      <div class="title">
        {step.title || StepTypes[step.type as keyof typeof StepTypes] || "빈 스텝"}
      </div>
    </div>
  </div>
  {#if step.type === "Component.create"}
    <Component
      id={step.payload.componentId}
      parents={[id, ...parents]}
      {noGrab}
      onNodeCountChanged={() => reload("nodeMoved")}
    />
  {/if}
</div>

<style>
  .step {
    width: 100%;
    font-weight: 600;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .step.activated {
    background-color: var(--orange);
    color: #fff;
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
    overflow-x: hidden;
  }
  .title-wrapper {
    height: 100%;
    width: calc(100% - 25px);
    position: relative;
  }
  .title {
    transform: translateY(5.5px);
    width: 100%;
    position: absolute;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
</style>
