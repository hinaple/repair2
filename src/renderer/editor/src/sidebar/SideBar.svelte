<script>
    import { onDestroy, onMount } from "svelte";
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
    import BigIcons from "../assets/icons/BigIcons.svelte";
    // import Grabber from "../lib/grabber";

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
        plugins: "Plugins",
        logs: "Logs"
    };
</script>

<div class="side-bar">
    <div class="tabs">
        {#each Object.keys(tabs) as id}
            <button
                class={["tab-wrapper", currentTab === id && "active"]}
                onclick={() => (currentTab = id)}
            >
                <div class="tab">
                    <BigIcons icon={id} color="#fff" size={30} />
                </div>
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
        width: 340px;
        height: 100%;
        z-index: var(--sidebar-z);
        color: #fff;
        padding: 0;
        box-sizing: border-box;
        font-family: "Pretend";
        user-select: none;
        display: flex;
        flex-direction: row;
        background-color: var(--darkgray);
        flex: 0 0 auto;
    }
    .tabs {
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        box-sizing: border-box;
    }
    .tab-wrapper {
        padding: 3px;
        cursor: pointer;
        opacity: 0.5;
    }
    .tab-wrapper:hover,
    .tab-wrapper.active {
        opacity: 1;
    }
    .tab {
        box-sizing: border-box;
        padding: 5px;
        border-radius: 5px;
        flex: 0 0 auto;
        margin-bottom: 3px;
    }
    .tab-wrapper.active > .tab {
        background-color: var(--w-o1);
    }
    .side-bar-body {
        border-inline: solid var(--w-o6) 1px;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;

        contain: paint layout size;
    }
    .title {
        font-size: 20px;
        padding: 15px 0 15px 20px;
        border-bottom: solid var(--w-o6) 1px;
        font-weight: 600;
        flex: 0 0 auto;
    }
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
