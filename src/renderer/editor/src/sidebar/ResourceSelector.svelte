<script>
    import { appData } from "../lib/syncData.svelte";
    import ResourcePreview from "../lib/ResourcePreview.svelte";
    import outClickAction from "../lib/outclickaction";
    import outScrollAction from "../lib/outscrollaction";
    import { tick } from "svelte";
    import Icon from "../assets/icons/Icon.svelte";

    let {
        resourceId = $bindable(null),
        type,
        onchange,
        removable = false,
        onremove = null
    } = $props();

    const RESOURCE_BTN_HEIGHT = 80;

    let resource = $derived(appData.resources.find((r) => r.id === resourceId));

    let isSelecting = $state(false);

    /** @type {HTMLDivElement} */
    let selectBtnEl = $state(null);
    /** @type {HTMLDivElement} */
    let containerEl = $state(null);
    /** @type {HTMLDivElement} */
    let listEl = $state(null);
    /** @type {HTMLInputElement} */
    let inputEl = $state(null);
    let searchString = $state("");

    let selectedResourceIdx = $state(0);

    async function open() {
        isSelecting = true;
        searchString = "";
        resourceList = appData.resources.filter((r) => !type || r.fileType === type);

        const selectBtnRect = selectBtnEl.getBoundingClientRect();
        await tick();
        inputEl.focus();

        containerEl.style.width = `${selectBtnRect.width}px`;
        containerEl.style.maxHeight = `${window.innerHeight / 2 - selectBtnRect.height / 2}px`;
        if (selectBtnRect.top + selectBtnRect.height / 2 < window.innerHeight / 2)
            containerEl.style.top = `${selectBtnRect.bottom}px`;
        else {
            containerEl.style.top = `${selectBtnRect.top}px`;
            containerEl.style.transform = "translateY(-100%)";
        }
        if (!resourceId) {
            selectedResourceIdx = 0;
            return;
        }

        focusBtn(
            resourceList.findIndex((r) => r.id === resourceId),
            { behavior: "instant", block: "start" }
        );
    }
    function close() {
        if (!isSelecting) return;

        isSelecting = false;
        searchString = "";
        resourceList = [];
    }
    function focusBtn(idx, scrollOption = { behavior: "smooth", block: "nearest" }) {
        selectedResourceIdx = idx;
        listEl.children[selectedResourceIdx].scrollIntoView(scrollOption);
    }

    function selectResource(id) {
        resourceId = id;
        isSelecting = false;
        onchange(id);
    }

    let resourceTitle = $derived(resource?.title || "할당된 자원 없음");
    let resourceList = $state([]);

    function onkeydown(e) {
        if (e.key === "ArrowDown")
            focusBtn(Math.min(resourceList.length - 1, selectedResourceIdx + 1));
        else if (e.key === "ArrowUp") focusBtn(Math.max(0, selectedResourceIdx - 1));
        else if (e.key === "Escape") close();
        else if (e.key === "Enter" && selectedResourceIdx >= 0)
            selectResource(resourceList[selectedResourceIdx].id);
    }
    async function oninput() {
        resourceList = appData.resources.filter(
            (r) =>
                (!type || r.fileType === type) && (!searchString || r.title.includes(searchString))
        );
        const tempSelectedIdx = searchString
            ? 0
            : (resourceList.findIndex((r) => r.id === resourceId) ?? 0);
        await tick();
        focusBtn(tempSelectedIdx, {
            behavior: "instant"
        });
    }
</script>

{#if isSelecting}
    <div
        bind:this={containerEl}
        class="resource-selector"
        style={`--resource-btn-height: ${RESOURCE_BTN_HEIGHT}px;`}
        use:outClickAction={{ callback: close, excludes: [selectBtnEl] }}
        use:outScrollAction={close}
    >
        <div class={["search-zone", !searchString?.length && "hidden"]}>
            <input
                bind:this={inputEl}
                bind:value={searchString}
                type="text"
                {onkeydown}
                {oninput}
            />
        </div>
        <div bind:this={listEl} class="resource-list">
            {#each resourceList as option, i}
                <button
                    class={[
                        "resource",
                        resourceId === option.id && "selected",
                        selectedResourceIdx === i && "focussed"
                    ]}
                    onclick={() => {
                        selectResource(option.id);
                    }}
                >
                    <ResourcePreview resource={option} controls={false} small />
                    <div class="file-name">
                        <span class={["resource-title", option.title.length > 10 && "small"]}
                            >{option.title}</span
                        >
                    </div>
                </button>
            {:else}
                <div class="no-resource">자원 없음</div>
            {/each}
        </div>
    </div>
{/if}

<div
    class={["select-btn", isSelecting && "active"]}
    bind:this={selectBtnEl}
    onclick={() => {
        isSelecting ? close() : open();
    }}
>
    <div class="preview">
        {#if resource}
            <ResourcePreview {resource} controls={false} />
        {:else}
            <div class="question-mark">?</div>
        {/if}
    </div>
    <div class={["file-name", removable && "removable"]}>
        <span class={["resource-title", resourceTitle.length > 10 && "small"]}>
            {resourceTitle}
        </span>
        {#if removable}
            <div
                class="remove"
                onclick={(evt) => {
                    evt.stopPropagation();
                    onremove();
                }}
            >
                <Icon icon="close" color="#fff" size={12} lineWidth={1.5} />
            </div>
        {/if}
    </div>
</div>

<style>
    .resource-selector {
        padding-left: 5px;
        box-sizing: border-box;
        width: 100%;
        max-height: 50vh;
        position: absolute;
        background-color: hsl(0, 0%, 80%);
        z-index: 200;
        box-shadow: var(--b-o8) 0 0 8px;
        display: flex;
        flex-direction: column;
    }
    .search-zone {
        flex: 0 0 auto;
        width: 100%;
        padding: 5px 18px 0 0;
        box-sizing: border-box;
        overflow: hidden;
        input {
            width: 100%;
            display: block;
            border: none;
            background: none;
            font: inherit;
            border-bottom: solid #000 1px !important;
            padding: 5px 2px;
            border-radius: 0;
            color: #000;
        }
    }
    .search-zone.hidden {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }
    .resource-list {
        width: 100%;
        flex: 1 1 auto;
        overflow-y: auto;
        scrollbar-gutter: stable;
        scroll-padding-block: 5px;
        padding-block: 5px;
    }
    .resource-list::-webkit-scrollbar-thumb {
        background-color: #000;
    }
    .resource {
        padding: 5px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        height: var(--resource-btn-height);
        color: #000;
        font-weight: 600;
        cursor: pointer;
        overflow: hidden;
        gap: 5px;
        width: 100%;
    }
    .resource:not(:last-child) {
        border-bottom: solid #000 1px;
    }
    .resource:hover,
    .resource.focussed {
        background-color: var(--b-o1);
    }
    .resource.selected {
        background-color: var(--b-o2);
    }

    .select-btn {
        width: 100%;
        padding: 5px 8px 5px 5px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        background-color: var(--w-o2);
        height: 80px;
        color: #fff;
        font-weight: 400;
        cursor: pointer;
        gap: 5px;
        overflow: hidden;
        border: solid transparent 1px;

        transition: border-color 200ms;
    }
    .select-btn:hover,
    .select-btn.active {
        border-color: #fff;
    }
    .preview {
        flex: 1 1 100px;
        min-width: 60px;
        height: 100%;
        overflow: hidden;
    }
    .file-name {
        flex: 1 1 auto;
        text-align: right;
        word-break: break-all;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .file-name.removable {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: end;
        padding-block: 2px;
        box-sizing: border-box;
    }
    .resource-title.small {
        font-size: 14px;
    }
    .remove {
        padding: 5px;
        background-color: rgba(180, 0, 0, 0.8);
        cursor: pointer;
        opacity: 0.6;
        border: solid transparent 1px;
    }
    .remove:hover {
        border-color: #fff;
        opacity: 1;
    }
    .preview:has(.question-mark) {
        flex: 0 0 auto;
        width: 80px !important;
        height: var(--resource-btn-height) !important;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .question-mark {
        font-size: 30px;
        opacity: 0.5;
    }
    .no-resource {
        width: 100%;
        color: #000;
        opacity: 0.8;
        text-align: center;
    }
</style>
