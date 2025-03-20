<script>
    import Node from "../Node.svelte";
    import { get } from "svelte/store";
    import { grabbing } from "../../lib/stores";
    import { currentFocus, focusData } from "../../sidebar/editUtils";
    import { removeNodeWithHistory } from "../../lib/syncData.svelte";
    import Value from "./Value.svelte";
    import { ComparisonOperatorTypes } from "../../lib/translate";
    import { outClicked } from "../../lib/contextMenu/contextUtils";
    import { ipcRenderer } from "electron";

    let { branch, onmousedown: bubbleMouseDown, ...nodeData } = $props();

    function onmousedown(evt) {
        bubbleMouseDown(evt);
        focusData("branch", branch);
    }
    function focusZoneMouseDown(evt) {
        if (evt.button || get(grabbing)) return;
        evt.stopPropagation();
        outClicked();
        onmousedown();
    }

    const contextmenu = [
        {
            label: "실행",
            click: () => {
                ipcRenderer.send("request-execute", { type: "node", id: branch.id });
                return true;
            }
        },
        { type: "seperator" },
        { label: "복사", click: () => {} },
        { label: "붙여넣기", click: () => {} },
        { type: "seperator" },
        {
            label: "삭제",
            click: () => {
                removeNodeWithHistory(branch);
                return true;
            },
            action: "remove"
        }
    ];
</script>

<Node
    node={branch}
    title={branch.alias?.length ? branch.alias : "분기"}
    {onmousedown}
    isFocused={$currentFocus.obj === branch}
    {contextmenu}
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
                    rightBorder
                    value={branch.valueA}
                    onmousedown={focusZoneMouseDown}
                />
                <Value pre="값B: " value={branch.valueB} onmousedown={focusZoneMouseDown} />
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
