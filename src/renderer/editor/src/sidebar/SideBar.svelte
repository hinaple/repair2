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
    import EntryEdit from "./edits/EntryEdit.svelte";
    import Variables from "./variable/Variables.svelte";
    import Resources from "./resource/Resources.svelte";

    const EditComponents = {
        project: ProjectEdit,
        sequence: SequenceEdit,
        step: StepEdit,
        branch: BranchEdit,
        valueProcess: ValueProcessEdit,
        value: ValueEdit,
        component: ComponentEdit,
        element: ElementEdit,
        listener: ListenerEdit,
        entry: EntryEdit
    };
    let CurrentEditComponent = $state();
    let currentFocus = $state();
    let currentTab = $state("edit");

    const unsub = currentFocusStore.subscribe((cf) => {
        currentFocus = cf;
        CurrentEditComponent = EditComponents[cf.type];
    });
    onDestroy(unsub);

    const tabs = [
        { id: "edit", label: "Edit" },
        { id: "variables", label: "Variables" },
        { id: "resources", label: "Resources" }
    ];
</script>

<div class="side-bar">
    <div class="tabs">
        {#each tabs as tab}
            <button
                class="tab"
                class:active={currentTab === tab.id}
                onclick={() => (currentTab = tab.id)}
            >
                {tab.label}
            </button>
        {/each}
    </div>

    {#if currentTab === "edit"}
        <div class="title">{SideBarOptions[currentFocus.type]}</div>
        <div class="options">
            {#key currentFocus}
                <CurrentEditComponent data={get(currentFocusStore).obj} />
            {/key}
        </div>
    {:else if currentTab === "variables"}
        <Variables />
    {:else if currentTab === "resources"}
        <Resources />
    {/if}
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
        padding: 0;
        box-sizing: border-box;
        font-family: "Pretend";
        user-select: none;
        display: flex;
        flex-direction: column;
    }
    .tabs {
        display: flex;
        padding: 10px 10px 0 10px;
        gap: 5px;
        background: rgba(0, 0, 0, 0.3);
    }
    .tab {
        padding: 8px 15px;
        border: none;
        background: transparent;
        color: #fff;
        font-family: "Pretend";
        font-size: 16px;
        cursor: pointer;
        border-radius: 5px 5px 0 0;
        opacity: 0.7;
    }
    .tab:hover {
        opacity: 0.9;
    }
    .tab.active {
        background: rgba(255, 255, 255, 0.1);
        opacity: 1;
    }
    .title {
        font-family: "HelveticaExt";
        font-size: 28px;
        padding: 20px 5px;
        margin: 0 20px;
        text-align: center;
        border-bottom: solid #fff 1px;
        font-weight: 400;
        flex: 0 0 auto;
    }
    .options {
        width: 100%;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 20px 6px 70px 20px;
        gap: 15px;
        box-sizing: border-box;
        scrollbar-gutter: stable;
    }
</style>
