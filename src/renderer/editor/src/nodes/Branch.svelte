<script lang="ts">
  import { ComparisonOperatorTypes } from "../lib/translate";
  import { getMutator } from "../project/store";
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
  const editor = $derived(getMutator().record<"nodes", Types.Branch>("nodes", id));
  const branch = $derived(editor.value);
</script>

<Node
  {id}
  title={branch.alias?.length ? branch.alias : "분기"}
  {isLastHold}
  {onpointerdown}
  minWidth={350}
  outputs={[
    { binding: editor.field("trueOutput"), id: `${id}_true`, label: "참" },
    { binding: editor.field("falseOutput"), id: `${id}_false`, label: "거짓" }
  ]}
>
  {#snippet body()}
    <div class="body">
      <div class="values">
        <Value pre="값A: " id={branch.valueA} parents={[id]} isValueA />
        <Value pre="값B: " id={branch.valueB} parents={[id]} />
      </div>
      <div class="operator">
        {ComparisonOperatorTypes[branch.operator as keyof typeof ComparisonOperatorTypes] ?? "?"}
      </div>
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
    border-radius: 0 0 20px 20px;
    corner-shape: squircle;
    min-width: 350px;
  }
  .values {
    display: flex;
    flex-direction: row;
    width: 100%;
    z-index: 2;
  }
  .operator {
    width: 100%;
    height: 60px;
    background-color: #000;
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    border-top: solid #000 2px;
    border-radius: 0 0 16px 16px;
    corner-shape: squircle;
  }
</style>
