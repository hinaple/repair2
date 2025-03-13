<script>
    import { appData } from "../../lib/syncData.svelte";
    import ResourceClass from "@classes/resource.svelte";
    import { addHistory } from "../../lib/workHistory";
    import Resource from "./Resource.svelte";

    function addResource(evt) {
        evt.stopPropagation();
        addHistory({
            doFn: (v) => {
                appData.resources.push(v);
            },
            undoFn: () => {
                appData.resources.pop();
            },
            doData: new ResourceClass({})
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
    {#each appData.resources as resource, index}
        <Resource {resource} remove={() => remove(index)} />
    {/each}
    <div class="add" onclick={addResource}>리소스 추가</div>
</div>

<style>
    .resources {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        padding: 20px 6px 20px 20px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 10px;
        scrollbar-gutter: stable;
    }
    .add {
        width: 100%;
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
