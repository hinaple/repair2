<script lang="ts">
  import { getMutator, getProject } from "../project/store";
  import Node from "./Node.svelte";
  import Value from "./value/Value.svelte";
  import type { Types } from "@shared/projectData/types";

  let {
    id,
    isLastHold = false,
    onpointerdown = () => {}
  }: {
    id: string;
    isLastHold?: boolean;
    onpointerdown?: (event: PointerEvent) => unknown;
  } = $props();
  const editor = $derived(getMutator().record<"nodes", Types.VariableSet>("nodes", id));
  const variableSet = $derived(editor.value);
  let variableName = $derived(
    (variableSet.variable ? getProject().variables.get(variableSet.variable)?.name : null) ?? "없음"
  );
</script>

<Node
  {id}
  title={variableSet.alias?.length ? variableSet.alias : "변수설정"}
  {isLastHold}
  {onpointerdown}
  outputs={[{ binding: editor.field("output"), id }]}
>
  {#snippet body()}
    <div class="body">
      <div class="value-wrapper">
        <Value pre="초기값: " isFull id={variableSet.value} parents={[id]} />
      </div>
      <div class="variable">변수 {variableName}</div>
    </div>
  {/snippet}
</Node>

<style>
  .body {
    display: flex;
    flex-direction: column;
    border: solid #000 2px;
    border-top-width: 0;
    box-sizing: border-box;
    border-radius: 0 0 10px 10px;
  }
  .value-wrapper {
    z-index: 2;
  }
  .variable {
    width: 100%;
    height: 25px;
    background-color: #000;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    border-top: solid #000 2px;
    border-radius: 0 0 8px 8px;
  }
</style>
