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
    import VariableSetEdit from "./edits/VariableSetEdit.svelte";
    import Plugins from "./plugins/Plugins.svelte";

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
        entry: EntryEdit,
        variableSet: VariableSetEdit
    };
    let CurrentEditComponent = $state();
    let currentFocus = $state();
    let currentTab = $state("edit");

    const unsub = currentFocusStore.subscribe((cf) => {
        currentFocus = cf;
        CurrentEditComponent = EditComponents[cf.type];
    });
    onDestroy(unsub);

    const tabs = {
        edit: "Edit",
        variables: "Variables",
        resources: "Resources",
        plugins: "Plugins"
    };
</script>

<div class="side-bar">
    <div class="tabs">
        {#each Object.entries(tabs).toReversed() as [id, label]}
            <button class="tab" class:active={currentTab === id} onclick={() => (currentTab = id)}>
                {label}
            </button>
        {/each}
    </div>

    <div class="side-bar-body">
        {#if currentTab === "edit"}
            <div class="title">{SideBarOptions[currentFocus.type]}</div>
            <div class="options">
                {#key currentFocus}
                    <CurrentEditComponent data={get(currentFocusStore).obj} />
                {/key}
            </div>
        {:else}
            <div class="title">{tabs[currentTab]}</div>
            {#if currentTab === "variables"}
                <Variables />
            {:else if currentTab === "resources"}
                <Resources />
            {:else if currentTab === "plugins"}
                <Plugins />
            {/if}
        {/if}
    </div>
</div>

<style>
    .side-bar {
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
        height: 100%;
        z-index: 100;
        color: #fff;
        padding: 0;
        box-sizing: border-box;
        font-family: "Pretend";
        user-select: none;
        pointer-events: none;
    }
    .tabs {
        position: absolute;
        left: 0;
        top: 0;
        display: flex;
        flex-direction: row;
        pointer-events: all;
        height: fit-content;
        transform-origin: right bottom;
        transform: translate(-100%, -100%) rotate(-90deg);
        overflow-y: hidden;

        gap: 1px;
    }
    .tab {
        padding: 5px 10px;
        border: none;
        color: #fff;
        font-family: "Pretend";
        font-size: 16px;
        cursor: pointer;
        border-radius: 5px 5px 0 0;
        opacity: 0.7;
        width: fit-content;
        height: fit-content;
        flex: 0 0 auto;
        background: #000;
        transform: translateY(6px);

        transition: transform 100ms ease-out;
    }
    .tab:hover,
    .tab.active {
        transform: translateY(0);
    }
    .tab.active {
        background: rgba(0, 0, 0, 0.8);
        opacity: 1;
    }
    .side-bar-body {
        width: 100%;
        height: 100%;
        pointer-events: all;
        display: flex;
        flex-direction: column;
        background-color: rgba(0, 0, 0, 0.8);
        flex: 1 1 auto;
        backdrop-filter: blur(4px);
    }
    .title {
        font-size: 20px;
        padding: 15px 0 15px 20px;
        border-bottom: solid #fff 1px;
        font-weight: 600;
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
