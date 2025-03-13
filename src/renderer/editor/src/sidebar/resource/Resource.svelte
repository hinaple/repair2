<script>
    import Icon from "../../assets/icons/Icon.svelte";
    import InputField from "../InputField.svelte";
    import { hoverHighlight } from "../../lib/highlight";
    import FoldArrow from "../../lib/FoldArrow.svelte";
    import ResourcePreview from "../../lib/ResourcePreview.svelte";
    import { ipcRenderer } from "electron";
    import { join } from "path";
    import { addHistory } from "../../lib/workHistory";

    let { resource, remove } = $props();

    async function selectFile() {
        const AssetDir = join(ipcRenderer.sendSync("getDataDir"), "assets");
        const result = await ipcRenderer.sendSync("selectFile", {
            title: "자원 파일을 선택하세요.",
            defaultPath: AssetDir,
            properties: ["openFile"]
        })[0];
        if (!result.includes(AssetDir)) return;

        const src = result.replace(AssetDir, "").replace(/^\\/, "").replace(/\\/g, "/");
        addHistory({
            doFn: ({ that, src }) => {
                that.src = src;
            },
            doData: { that: resource, src },
            undoData: { that: resource, src: resource.src }
        });
    }
</script>

<div class="resource" use:hoverHighlight={{ type: "resource", data: resource.id }}>
    <div class="top">
        <div class="name">{resource.alias?.length ? resource.alias : "이름 없는 자원"}</div>
        <FoldArrow bind:folded={resource.folded} />
    </div>
    {#if !resource.folded}
        <div class="body">
            <ResourcePreview {resource} />
            <div class="src">
                <span>{resource.src ?? "선택된 파일 없음"}</span>
                <div class="select-file" onclick={selectFile}>파일 선택</div>
            </div>
        </div>
    {/if}
</div>

<style>
    .resource {
        display: flex;
        flex-direction: column;
        width: 100%;
        background-color: rgba(255, 255, 255, 0.2);
        padding: 10px;
        box-sizing: border-box;
        border-radius: 10px;
    }
    .top {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .name {
        flex: 1 1 auto;
        font-weight: 600;
    }
    .body {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 10px;
        border-top: solid #fff 1px;
        padding-top: 10px;
        margin-top: 10px;
    }
    .src {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        overflow: hidden;
        word-break: break-all;
        flex-wrap: wrap;
    }
    .select-file {
        margin-inline: auto 5px;
        padding: 5px 8px;
        background-color: rgba(255, 255, 255, 0.8);
        background-color: rgba(255, 255, 255, 0.8);
        border-radius: 10px;
        color: #000;
        cursor: pointer;
        opacity: 0.8;
        font-weight: 600;
        font-size: 14px;
    }
    .select-file:hover {
        opacity: 1;
    }
</style>
