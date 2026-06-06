<script>
    import Node from "./Node.svelte";
    import { get } from "svelte/store";
    import { grabbing } from "../lib/stores";
    import Value from "./value/Value.svelte";
    import { outClicked } from "../lib/contextMenu/contextUtils";
    import { appData } from "../lib/syncData.svelte";

    let { variableSet, onpointerdown, ...nodeData } = $props();

    function focusZoneMouseDown(evt) {
        if (evt.button || $grabbing) return;
        evt.stopPropagation();
        outClicked();
        onpointerdown();
    }

    let variableName = $derived(appData.findVariableById(variableSet.variable)?.name ?? "없음");
</script>

<Node
    node={variableSet}
    type="variableSet"
    title={variableSet.alias?.length ? variableSet.alias : "변수설정"}
    {onpointerdown}
    outputs={[{ output: variableSet.output, id: variableSet.id }]}
    {...nodeData}
>
    {#snippet body()}
        <div class="body">
            <div class="value-wrapper">
                <Value
                    pre="초기값: "
                    isFull
                    value={variableSet.value}
                    onpointerdown={focusZoneMouseDown}
                    parent={variableSet}
                />
            </div>
            <div class="variable" onpointerdown={focusZoneMouseDown}>
                변수 {variableName}
            </div>
        </div>
    {/snippet}
</Node>

<style>
    .body {
        display: flex;
        flex-direction: column;
        border: solid #000 2px;
        border-top-width: 0;
        box-sizing: border-box;
        border-radius: 0 0 10px 10px;
    }
    .value-wrapper {
        z-index: 2;
    }
    .variable {
        width: 100%;
        height: 25px;
        background-color: #000;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        border-top: solid #000 2px;
        border-radius: 0 0 8px 8px;
    }
</style>
