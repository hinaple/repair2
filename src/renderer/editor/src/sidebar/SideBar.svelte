<script>
    import Variables from "./variable/Variables.svelte";
    import Resources from "./resource/Resources.svelte";
    import Plugins from "./plugins/Plugins.svelte";
    import BigIcons from "../assets/icons/BigIcons.svelte";
    import Edit from "./edits/Edit.svelte";
    import Logs from "./log/Logs.svelte";
    import { tippy, tippySingleton } from "../lib/tippy";

    let currentTab = $state("edit");

    let title = $state();
    $effect(() => {
        if (currentTab !== "edit") title = tabs[currentTab];
    });

    const tabs = {
        edit: "Edit",
        variables: "Variables",
        resources: "Resources",
        plugins: "Plugins",
        logs: "Logs"
    };
</script>

<div class="side-bar">
    <div class="tabs" use:tippySingleton={{ duration: 100, delay: [400, 0], placement: "right" }}>
        {#each Object.entries(tabs) as [id, label]}
            <button
                class={["tab-wrapper", currentTab === id && "active"]}
                onclick={() => (currentTab = id)}
                data-tippy-content={label}
            >
                <div class="tab">
                    <BigIcons icon={id} color="#fff" size={30} />
                </div>
            </button>
        {/each}
    </div>
    <div class="side-bar-body">
        <div class="title">{title}</div>
        {#if currentTab === "edit"}
            <Edit bind:title />
        {:else if currentTab === "variables"}
            <Variables />
        {:else if currentTab === "resources"}
            <Resources />
        {:else if currentTab === "plugins"}
            <Plugins />
        {:else if currentTab === "logs"}
            <Logs />
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
</style>
