<script lang="ts">
  import { onDestroy } from "svelte";
  import Icon from "../assets/icons/Icon.svelte";
  import { data } from "../lib/editUtils/dataAction";
  import registerHighlight, { type HighlightData } from "../lib/highlight";
  import { startMonitoring } from "../lib/runtimeMonitor.svelte";
  import { reloadNode } from "../lib/stores";
  import { StepTypes } from "../lib/translate";
  import { getMutator } from "../project/store";
  import type { SortableProps } from "./types";
  import Component from "./component/Component.svelte";

  let {
    id,
    onpointerdown,
    noGrab = false,
    parents,
    nodeId
  }: SortableProps & {
    parents: string[];
    nodeId: string;
  } = $props();

  const editor = $derived(getMutator().record("steps", id));
  const step = $derived(editor.value);

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

  let title = $derived.by(() => {
    if (step.title) return step.title;

    const Default = StepTypes[step.type as keyof typeof StepTypes];
    if (step.type === "delay") return `${Default} ${step.payload.delayMs}ms`;
    if (step.type === "Communication.Serial.send") return `시리얼 통신(${step.payload.data})`;
    if (step.type === "Communication.Socket.send")
      return (
        `소켓 통신(${step.payload.channel}` + (step.payload.data ? `:${step.payload.data})` : ")")
      );
    if (step.type === "Communication.Mqtt.publish")
      return (
        `MQTT(${step.payload.topic}` + (step.payload.payload ? `:${step.payload.payload})` : ")")
      );
    if (step.type === "Component.remove" && step.payload.componentAlias)
      return `${step.payload.componentAlias} ${Default}`;
    if (step.type === "Others.eventEmit")
      return `${step.payload.channel}` + (step.payload.data ? `:${step.payload.data}` : "");
    if (step.type.startsWith("Audio.") && (step.payload as any).channel)
      return `${Default}(${(step.payload as any).channel})`;

    if (step.type === "") return "빈 스텝";
    return StepTypes[step.type as keyof typeof StepTypes] || step.type;
  });
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
        {title}
      </div>
    </div>
  </div>
  {#if step.type === "Component.create"}
    <Component
      id={step.payload.componentId}
      parents={[id, ...parents]}
      {noGrab}
      onNodeCountChanged={() => reloadNode(nodeId)}
      {nodeId}
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
