<script lang="ts">
  import Icon from "../../assets/icons/Icon.svelte";
  import { data } from "../../lib/editUtils/dataAction";
  import { focusData } from "../../lib/editUtils/focus";
  import registerHighlight from "../../lib/highlight";
  import { grabbing, reload } from "../../lib/stores";
  import { BaseValueTypes } from "../../lib/translate";
  import { Factories } from "../../project/factories";
  import { getMutator } from "../../project/store";
  import Sortable from "../Sortable.svelte";
  import ValueProcess from "./ValueProcess.svelte";

  let {
    id,
    parents,
    pre,
    isFull = false,
    isValueA = false,
    inNodeSpace = true
  }: {
    id: string;
    parents: string[];
    pre: string;
    isFull?: boolean;
    isValueA?: boolean;
    inNodeSpace?: boolean;
  } = $props();

  const editor = $derived(getMutator().record("values", id));
  const value = $derived(editor.value);

  if (inNodeSpace)
    $effect(() => {
      value.baseValue;
      reload("nodeMoved");
    });

  function addProcess(event: PointerEvent) {
    if ($grabbing) return;
    event.stopPropagation();
    const processId = getMutator().transaction(() => {
      const newId = Factories.valueProcess();
      editor.field("process").splice(value.process.length, 0, newId);
      return newId;
    });
    focusData("valueProcess", processId, [id, ...parents]);
    reload("nodeMoved");
  }

  let highlightActive = $derived(value.baseType === "variable" && !!value.baseValue);
</script>

<div class={["value-wrapper", isFull && "full", isValueA && "right-border"]}>
  <div
    class="value"
    use:data={{ type: "value", id, parents }}
    use:registerHighlight={highlightActive
      ? { type: "variable", data: value.baseValue ?? "" }
      : null}
  >
    <div class="base-value">
      <div class="text">
        {pre}<b
          >{value.baseType === "string" && value.baseValue?.length
            ? value.baseValue
            : (BaseValueTypes[value.baseType as keyof typeof BaseValueTypes] ?? "알 수 없는 값")}</b
        >
      </div>
    </div>
    <Sortable
      binding={editor.field("process")}
      itemType="valueProcesses"
      onresized={() => reload("nodeMoved")}
    >
      {#snippet children(props)}
        <ValueProcess parents={[id, ...parents]} {...props} />
      {/snippet}
    </Sortable>
    <div class="add" onpointerdown={addProcess}><Icon color="#000" lineWidth={2} /></div>
    <div class="empty-space"></div>
  </div>
</div>

<style>
  .value-wrapper {
    width: 50%;
    flex: 1 1 auto;
  }
  .value-wrapper.full {
    width: 100%;
  }
  .value-wrapper.right-border {
    border-right: solid #000 2px;
  }
  .value {
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background-color: rgba(238, 238, 238, 0.4);
  }
  .base-value {
    height: 30px;
    border-bottom: solid #000 2px;
    padding-inline: 5px;
    width: 100%;
    font-weight: 600;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    background-color: var(--b-o2);
    flex: 0 0 auto;
  }
  .text {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }
  .empty-space {
    flex: 1 1 auto;
    background: repeating-linear-gradient(
      -45deg,
      rgba(0, 0, 0, 0.6),
      rgba(0, 0, 0, 0.6) 3px,
      var(--b-o3) 3px,
      var(--b-o3) 6px
    );
  }
  .add {
    width: 100%;
    height: 20px;
    background-color: var(--b-o2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: 0 0 auto;
    border-bottom: solid #000 2px;
    box-sizing: border-box;
    margin-bottom: -2px;
  }
  .add :global(svg) {
    height: 10px;
  }
</style>
