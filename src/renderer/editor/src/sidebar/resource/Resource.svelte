<script>
    import Icon from "../../assets/icons/Icon.svelte";
    import InputField from "../InputField.svelte";
    import { hoverHighlight } from "../../lib/highlight";
    import FoldArrow from "../../lib/FoldArrow.svelte";
    import ResourcePreview from "../../lib/ResourcePreview.svelte";
    import { changeResourceFile } from "./selectResourceFile";

    let { resource, remove } = $props();
</script>

<div class="resource" use:hoverHighlight={{ type: "resource", data: resource.id }}>
    <div class="top" onclick={() => (resource.folded = !resource.folded)}>
        <div class="name">{resource.title}</div>
        <FoldArrow folded={resource.folded} />
    </div>
    {#if !resource.folded}
        <div class="body">
            <ResourcePreview {resource} />
            <div class="src" onclick={() => changeResourceFile(resource)}>
                <span>{resource.src ?? "선택된 파일 없음"}</span>
                <div class="select-file">파일 선택</div>
            </div>
            <hr />
            <InputField
                label="자원 이름"
                value={resource.alias}
                placeholder={resource.title}
                setter={(d) => (resource.alias = d)}
                autofocus
                small
                row
            />
            <div class="remove" onclick={remove}>
                <Icon icon="bin" color="#fff" size={15} />
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
        box-sizing: border-box;
        border-radius: 10px;
    }
    .top {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        padding: 10px 5px 10px 10px;
        width: 100%;
        box-sizing: border-box;
    }
    .name {
        flex: 1 1 auto;
        font-weight: 600;
        word-break: break-all;
    }
    .body {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 5px;
        border-top: solid #fff 1px;
        padding: 20px 10px;
        box-sizing: border-box;
    }
    .src {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        overflow: hidden;
        word-break: break-all;
        flex-wrap: wrap;
        cursor: pointer;
        flex: 0 0 auto;
    }
    .select-file {
        margin-left: auto;
        padding: 5px 8px;
        background-color: rgba(255, 255, 255, 0.8);
        border-radius: 10px;
        color: #000;
        opacity: 0.8;
        font-weight: 600;
        font-size: 14px;
    }
    .src:hover > .select-file {
        opacity: 1;
    }
    hr {
        border-width: 1px;
        margin-block: 15px;
    }
    .remove {
        margin: 15px 5px 0 auto;
        padding: 10px;
        border-radius: 10px;
        background-color: #ff3939;
        cursor: pointer;
        opacity: 0.8;
    }
    .remove:hover {
        opacity: 1;
    }
</style>
