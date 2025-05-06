<script>
    import Node from "../Node.svelte";
    import { get } from "svelte/store";
    import { grabbing } from "../../lib/stores";
    import Value from "./Value.svelte";
    import { ComparisonOperatorTypes } from "../../lib/translate";
    import { outClicked } from "../../lib/contextMenu/contextUtils";

    let { branch, onmousedown, ...nodeData } = $props();

    function focusZoneMouseDown(evt) {
        if (evt.button || get(grabbing)) return;
        evt.stopPropagation();
        outClicked();
        onmousedown();
    }
</script>

<Node
    node={branch}
    type="branch"
    title={branch.alias?.length ? branch.alias : "분기"}
    {onmousedown}
    minWidth={350}
    outputs={[
        { output: branch.falseOutput, id: `${branch.id}_false`, label: "거짓" },
        { output: branch.trueOutput, id: `${branch.id}_true`, label: "참" }
    ]}
    {...nodeData}
>
    {#snippet body()}
        <div class="body">
            <div class="values">
                <Value
                    pre="값A: "
                    isValueA
                    value={branch.valueA}
                    onmousedown={focusZoneMouseDown}
                    parent={branch}
                />
                <Value
                    pre="값B: "
                    value={branch.valueB}
                    onmousedown={focusZoneMouseDown}
                    parent={branch}
                />
            </div>
            <div class="operator" onmousedown={focusZoneMouseDown}>
                {ComparisonOperatorTypes[branch.operator] ?? "?"}
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
        min-width: 350px;
    }
    .values {
        display: flex;
        flex-direction: row;
        width: 100%;
        z-index: 2;
    }
    .operator {
        width: 100%;
        height: 40px;
        background-color: #000;
        color: #fff;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        border-top: solid #000 2px;
        border-radius: 0 0 8px 8px;
    }
</style>
