<script>
    import { appData } from "../../lib/syncData.svelte";
    import VariableClass from "@classes/variable.svelte";
    import { addHistory } from "../../lib/workHistory";
    import Variable from "./Variable.svelte";

    let currentEdit = -1;
    function addVariable(evt) {
        evt.stopPropagation();
        addHistory({
            doFn: (v) => {
                appData.variables.push(v);
            },
            undoFn: () => {
                appData.variables.pop();
            },
            doData: new VariableClass({})
        });
        currentEdit = appData.variables.length - 1;
    }

    function remove(idx) {
        addHistory({
            doFn: (idx) => {
                appData.variables.splice(idx, 1);
            },
            undoFn: ({ idx, variable }) => {
                appData.variables.splice(idx, 0, variable);
            },
            doData: idx,
            undoData: { idx, variable: appData.variables[idx] }
        });
    }
</script>

<div class="variables">
    <div class="list">
        {#each appData.variables as variable, index}
            <Variable
                {variable}
                isEditing={currentEdit === index}
                edit={(evt) => {
                    evt.stopPropagation();
                    currentEdit = index;
                }}
                blur={() => (currentEdit = -1)}
                remove={() => remove(index)}
            />
        {/each}
    </div>
    <div class="add" onclick={addVariable}>변수 선언</div>
</div>

<style>
    .variables {
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
