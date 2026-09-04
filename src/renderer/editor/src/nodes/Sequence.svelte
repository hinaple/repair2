<script lang="ts">
  import Icon from "../assets/icons/Icon.svelte";
  import { focusData } from "../lib/editUtils/focus";
  import { grabbing, reload } from "../lib/stores";
  import { Factories } from "../project/factories";
  import { getMutator } from "../project/store";
  import Node from "./Node.svelte";
  import Sortable from "./Sortable.svelte";
  import Step from "./Step.svelte";
  import type { Types } from "@shared/projectData/types";
  import type { FieldBinding } from "../project/mutator";

  let {
    id,
    isLastHold = false,
    onpointerdown = () => {}
  }: {
    id: string;
    isLastHold?: boolean;
    onpointerdown?: (event: PointerEvent) => unknown;
  } = $props();

  const editor = $derived(getMutator().record<"nodes", Types.Sequence>("nodes", id));
  const sequence = $derived(editor.value);

  function addStep(event: PointerEvent) {
    if (event.button || $grabbing) return;
    event.stopPropagation();
    const stepId = getMutator().transaction(() => {
      const newId = Factories.step();
      editor.field("steps").splice(sequence.steps.length, 0, newId);
      return newId;
    });
    focusData("step", stepId, [id]);
    reload("nodeMoved");
  }

  let innerOutputs = $derived.by(() => {
    const outputs: { id: string; binding: FieldBinding<string | null> }[] = [];
    for (const stepId of sequence.steps) {
      const step = getMutator().record("steps", stepId).value;
      if (step.type !== "Component.create") continue;
      const component = getMutator().record("components", step.payload.componentId).value;
      for (const elementId of component.elements) {
        const element = getMutator().record("elements", elementId).value;
        for (const listenerId of element.listeners) {
          outputs.push({
            id: listenerId,
            binding: getMutator().record("listeners", listenerId).field("output")
          });
        }
      }
    }
    return outputs;
  });
</script>

<Node
  {id}
  outputs={[{ id, binding: editor.field("output") }]}
  {innerOutputs}
  title={sequence.alias?.length ? sequence.alias : "시퀀스"}
  {isLastHold}
  {onpointerdown}
>
  {#snippet body()}
    <div class="body">
      <Sortable
        binding={editor.field("steps")}
        itemType="steps"
        onresized={() => reload("nodeMoved")}
        onmoved={() => reload("nodeMoved")}
      >
        {#snippet children(props)}
          <Step parents={[id]} {...props} />
        {/snippet}
      </Sortable>
      <div class="add" onpointerdown={addStep}><Icon color="#fff" lineWidth={2} /></div>
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
    background-color: rgba(238, 238, 238, 0.4);
  }
  .add {
    width: 100%;
    height: 15px;
    background-color: #000;
    border-radius: 0 0 8px 8px;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .add :global(svg) {
    height: 10px;
  }
</style>
