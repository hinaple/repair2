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

    let resource = $derived(appData.resources.find((r) => r.id === resourceId));

    let isSelecting = $state(false);

    let selectBtnEl = $state(null);
    let listEl = $state(null);

    async function opened() {
        const selectBtnRect = selectBtnEl.getBoundingClientRect();
        await tick();
        listEl.style.width = `${selectBtnRect.width}px`;
        listEl.style.maxHeight = `${window.innerHeight / 2 - selectBtnRect.height / 2}px`;
        if (selectBtnRect.top + selectBtnRect.height / 2 < window.innerHeight / 2)
            listEl.style.top = `${selectBtnRect.bottom}px`;
        else {
            listEl.style.top = `${selectBtnRect.top}px`;
            listEl.style.transform = "translateY(-100%)";
        }
    }
</script>

{#if isSelecting}
    <div
        class="resource-selector"
        bind:this={listEl}
        use:outClickAction={() => (isSelecting = false)}
        use:outScrollAction={() => (isSelecting = false)}
    >
        {#each appData.resources.filter((r) => (type ? r.fileType === type : true)) as option}
            <div
                class="resource"
                onclick={() => {
                    resourceId = option.id;
                    isSelecting = false;
                    onchange(option.id);
                }}
            >
                <div class="preview">
                    <ResourcePreview resource={option} controls={false} />
                </div>
                <div class="file-name">
                    <span>{option.title}</span>
                </div>
            </div>
        {:else}
            <div class="no-resource">자원 없음</div>
        {/each}
    </div>
{/if}

<div
    class="select-btn"
    bind:this={selectBtnEl}
    onclick={(evt) => {
        evt.stopPropagation();
        isSelecting = !isSelecting;
        if (isSelecting) opened();
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
        <span>{resource?.title || "할당된 자원 없음"}</span>
        {#if removable}
            <div
                class="remove"
                onclick={(evt) => {
                    evt.stopPropagation();
                    onremove();
                }}
            >
                <Icon icon="bin" color="#fff" size={13} />
            </div>
        {/if}
    </div>
</div>

<style>
    .resource-selector {
        padding: 10px 0 10px 10px;
        box-sizing: border-box;
        border-radius: 10px;
        width: 100%;
        max-height: 50vh;
        position: absolute;
        background-color: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(5px);
        z-index: 200;
        overflow-y: auto;
        scrollbar-gutter: stable;
        box-shadow: rgba(0, 0, 0, 0.8) 0 0 8px;
    }
    .resource-selector::-webkit-scrollbar-thumb {
        background-color: #000;
    }
    .resource {
        padding: 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        height: 80px;
        color: #000;
        font-weight: 600;
        cursor: pointer;
        overflow: hidden;
        gap: 5px;
    }
    .resource:not(:last-child) {
        border-bottom: solid #000 1px;
    }
    .resource:hover {
        background-color: rgba(0, 0, 0, 0.2);
    }

    .select-btn {
        width: 100%;
        padding: 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        border-radius: 10px;
        background-color: rgba(255, 255, 255, 0.8);
        height: 80px;
        opacity: 0.8;
        color: #000;
        font-weight: 600;
        cursor: pointer;
        gap: 5px;
        overflow: hidden;
    }
    .select-btn:hover {
        opacity: 1;
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
    .remove {
        padding: 8px;
        border-radius: 10px;
        background-color: #ff3939;
        cursor: pointer;
        opacity: 0.8;
    }
    .remove:hover {
        opacity: 1;
    }
    .preview:has(.question-mark) {
        flex: 0 0 auto;
        width: 80px !important;
        height: 80px !important;
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
