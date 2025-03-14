<script>
    import { appData } from "../../lib/syncData.svelte";
    import ResourceClass from "@classes/resource.svelte";
    import { addHistory } from "../../lib/workHistory";
    import Resource from "./Resource.svelte";
    import { AssetDir, selectMany, splitPath } from "./selectResourceFile";
    import { ipcRenderer } from "electron";

    async function addResource(evt) {
        evt.stopPropagation();
        const srcs = await selectMany();
        if (!srcs?.length) return;

        const inAssets = [];
        let outAssets = [];
        srcs.forEach((s) =>
            s.includes(AssetDir) ? inAssets.push(splitPath(s)) : outAssets.push(s)
        );
        let doCopy = false;
        if (outAssets.length) {
            const result = await ipcRenderer.sendSync("dialogue", {
                type: "question",
                title: "다른 폴더의 파일이 있습니다.",
                message: `${outAssets.join("\n")}\n\n위 파일들을 자원 폴더에 복사하시겠습니까?`,
                buttons: ["자원 폴더에 복사", "건너뛰기"]
            });
            doCopy = result === 0;
        }
        if (doCopy) outAssets = await ipcRenderer.sendSync("copyInfoAsset", outAssets);
        const resourceArr = [...inAssets, ...(doCopy ? outAssets : [])].map(
            (s) => new ResourceClass({ src: s, folded: false })
        );

        addHistory({
            doFn: (resources) => {
                appData.resources.push(...resources);
            },
            undoFn: (deleteCount) => {
                appData.resources.splice(-deleteCount, deleteCount);
            },
            doData: resourceArr,
            undoData: resourceArr.length
        });
    }

    function remove(idx) {
        addHistory({
            doFn: (idx) => {
                appData.resources.splice(idx, 1);
            },
            undoFn: ({ idx, resource }) => {
                appData.resources.splice(idx, 0, resource);
            },
            doData: idx,
            undoData: { idx, resource: appData.resources[idx] }
        });
    }
</script>

<div class="resources">
    <div class="list">
        {#each appData.resources as resource, index}
            <Resource {resource} remove={() => remove(index)} />
        {/each}
    </div>
    <div class="add" onclick={addResource}>자원 추가</div>
</div>

<style>
    .resources {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: hidden;
        padding-block: 30px;
        align-items: center;
    }
    .list {
        border-radius: 10px;
        width: 100%;
        flex: 1 1 auto;
        overflow-y: auto;
        padding-inline: 20px 6px;
        scrollbar-gutter: stable;
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-sizing: border-box;
    }
    .add {
        flex: 0 0 auto;
        width: calc(100% - 40px);
        background-color: #fff;
        color: #000;
        border-radius: 10px;
        padding: 10px;
        box-sizing: border-box;
        cursor: pointer;
        font-weight: 600;
        text-align: center;
        opacity: 0.8;
    }
    .add:hover {
        opacity: 1;
    }
</style>
