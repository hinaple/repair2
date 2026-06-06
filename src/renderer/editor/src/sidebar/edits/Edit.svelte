<script>
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
    import { get } from "svelte/store";
    import { currentFocus as currentFocusStore } from "../editUtils";
    import { onDestroy } from "svelte";

    let { title = $bindable() } = $props();

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
    };
    let CurrentEditComponent = $state();

    const unsub = currentFocusStore.subscribe((cf) => {
        const currentEdit = Edits[cf.type];
        if (!currentEdit) return;

        CurrentEditComponent = currentEdit.component;
        title = currentEdit.title;
    });
    onDestroy(unsub);
</script>

<div class="options">
    {#if CurrentEditComponent}
        {#key CurrentEditComponent}
            <CurrentEditComponent data={get(currentFocusStore).obj} />
        {/key}
    {/if}
</div>

<style>
    .options {
        width: 100%;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        overflow-y: scroll;
        padding-block: 20px 70px;
        gap: 15px;
        box-sizing: border-box;
        padding-inline: 14px;
        --hr-pad: -14px;
    }
</style>
