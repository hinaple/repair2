<script>
    import { onDestroy } from "svelte";
    import { currentFocus as currentFocusStore } from "./editUtils";
    import SideBarOptions from "./sideBarTitles";

    import ProjectEdit from "./edits/ProjectEdit.svelte";
    import SequenceEdit from "./edits/SequenceEdit.svelte";
    import StepEdit from "./edits/StepEdit.svelte";
    import BranchEdit from "./edits/BranchEdit.svelte";
    import ValueProcessEdit from "./edits/ValueProcessEdit.svelte";
    import ValueEdit from "./edits/ValueEdit.svelte";
    import ComponentEdit from "./edits/ComponentEdit.svelte";
    import { get } from "svelte/store";
    import ElementEdit from "./edits/ElementEdit.svelte";
    import ListenerEdit from "./edits/ListenerEdit.svelte";

    const EditComponents = {
        project: ProjectEdit,
        sequence: SequenceEdit,
        step: StepEdit,
        branch: BranchEdit,
        valueProcess: ValueProcessEdit,
        value: ValueEdit,
        component: ComponentEdit,
        element: ElementEdit,
        listener: ListenerEdit
    };
    let CurrentEditComponent = $state();
    let currentFocus = $state();

    const unsub = currentFocusStore.subscribe((cf) => {
        currentFocus = cf;
        CurrentEditComponent = EditComponents[cf.type];
    });
    onDestroy(unsub);
</script>

<div class="side-bar">
    <div class="title">{SideBarOptions[currentFocus.type]}</div>
    <div class="options">
        {#key currentFocus}
            <CurrentEditComponent data={get(currentFocusStore).obj} />
        {/key}
    </div>
</div>

<style>
    .side-bar {
        position: fixed;
        top: 0;
        right: 0;
        height: 100%;
        width: 300px;
        background-color: rgba(0, 0, 0, 0.8);
        z-index: 100;
        backdrop-filter: blur(4px);
        color: #fff;
        padding: 20px 20px 0 20px;
        box-sizing: border-box;
        font-family: "Pretend";
        user-select: none;
    }
    .title {
        font-family: "HelveticaExt";
        font-size: 28px;
        padding: 0 5px 20px 5px;
        text-align: center;
        border-bottom: solid #fff 1px;
        font-weight: 500;
        flex: 0 0 auto;
        font-weight: 400;
    }
    .options {
        width: 100%;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding-block: 20px;
        gap: 15px;
    }
</style>
