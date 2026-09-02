<script lang="ts">
  import type { Component } from "svelte";
  import ProjectEdit from "./editPages/ProjectEdit.svelte";
  import SequenceEdit from "./editPages/SequenceEdit.svelte";
  import StepEdit from "./editPages/StepEdit.svelte";
  import BranchEdit from "./editPages/BranchEdit.svelte";
  import ValueProcessEdit from "./editPages/ValueProcessEdit.svelte";
  import ValueEdit from "./editPages/ValueEdit.svelte";
  import ComponentEdit from "./editPages/ComponentEdit.svelte";
  import ElementEdit from "./editPages/ElementEdit.svelte";
  import ListenerEdit from "./editPages/ListenerEdit.svelte";
  import EntryEdit from "./editPages/EntryEdit.svelte";
  import VariableSetEdit from "./editPages/VariableSetEdit.svelte";
  import { currentFocus } from "../../lib/editUtils/focus";
  import { getMutator, getProject } from "../../project/store";
  import type { FieldBinding } from "../../project/mutator";

  let { title = $bindable("") }: { title?: string } = $props();

  const Edits = {
    project: { title: "Project", component: ProjectEdit },
    sequence: { title: "Sequence", component: SequenceEdit },
    step: { title: "Step", component: StepEdit },
    branch: { title: "Branch Point", component: BranchEdit },
    valueProcess: { title: "Value Process", component: ValueProcessEdit },
    value: { title: "Value", component: ValueEdit },
    component: { title: "Component", component: ComponentEdit },
    element: { title: "Element", component: ElementEdit },
    listener: { title: "Listener", component: ListenerEdit },
    entry: { title: "Entry", component: EntryEdit },
    variableSet: { title: "Variable Set", component: VariableSetEdit }
  } as const;
  const RecordMap = {
    sequence: "nodes",
    branch: "nodes",
    entry: "nodes",
    variableSet: "nodes",
    step: "steps",
    valueProcess: "valueProcesses",
    value: "values",
    component: "components",
    element: "elements",
    listener: "listeners"
  } as const;
  let currentEdit = $derived.by(() => {
    const focus = $currentFocus;
    if (focus.type === "node") {
      const node = getProject().nodes.get(focus.target);
      return node ? Edits[node.nodeType] : undefined;
    }
    if (focus.type === "nodes") return undefined;
    return Edits[focus.type];
  });

  let CurrentEditComponent = $derived(
    currentEdit?.component as Component<{ editor: FieldBinding<unknown> }> | undefined
  );
  let editor = $derived.by(() => {
    const focus = $currentFocus;
    if (focus.type === "project") return getMutator().config();
    if (focus.type === "nodes") return null;
    if (focus.type === "node") return getMutator().record("nodes", focus.target);
    if (!(focus.type in RecordMap)) return null;
    const recordType = RecordMap[focus.type as keyof typeof RecordMap];
    if (!getProject().get(recordType, focus.target)) return null;
    return getMutator().record(recordType, focus.target);
  });

  $effect(() => {
    title = currentEdit ? currentEdit.title : "Nodes";
  });
</script>

<div class="options">
  {#if CurrentEditComponent && editor}
    {#key `${$currentFocus.type}:${$currentFocus.target}`}
      <CurrentEditComponent {editor} />
    {/key}
  {/if}
</div>

<style>
  .options {
    width: 100%;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden scroll;
    padding-block: 20px 70px;
    gap: 15px;
    box-sizing: border-box;
    padding-inline: 14px;
    --hr-pad: -14px;
  }
</style>
