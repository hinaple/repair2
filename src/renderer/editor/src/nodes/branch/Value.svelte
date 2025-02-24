<script>
    import { get } from "svelte/store";
    import Icon from "../../assets/icons/Icon.svelte";
    import Sortable from "../../lib/Sortable.svelte";
    import { BaseValueTypes } from "../../lib/translate";
    import ValueProcess from "./ValueProcess.svelte";
    import { grabbing, reload } from "../../lib/stores";
    import { addHistory } from "../../lib/workHistory";
    import { currentFocus, focusData } from "../../sidebar/editUtils";
    import { outClicked } from "../../lib/contextMenu/contextUtils";

    let { value, pre, rightBorder = false, onmousedown } = $props();

    $effect(() => {
        value.baseValue;
        reload("nodeMoved");
    });

    function addProcess() {
        if (get(grabbing)) return;
        value.process.addWithHistory(addHistory, () => reload("nodeMoved"));
    }

    function clickBase(evt) {
        if (evt.button || get(grabbing)) return;
        evt.stopPropagation();
        focusData("baseValue", value);
        outClicked();
    }
</script>

<div class={["value", rightBorder && "right-border"]}>
    <div class={["base-value", $currentFocus.obj === value && "focus"]} onmousedown={clickBase}>
        <div class="text">
            {pre}<b
                >{value.baseType === "string" && value.baseValue?.length
                    ? value.baseValue
                    : (BaseValueTypes[value.baseType] ?? "알 수 없는 값")}</b
            >
        </div>
    </div>
    <Sortable
        Component={ValueProcess}
        sortable={value.process}
        resized={() => {
            reload("nodeMoved");
        }}
    />
    <div class="add" onclick={addProcess}>
        <Icon color="#000" lineWidth={2} />
    </div>
    <div class="empty-space" {onmousedown}></div>
</div>

<style>
    .value {
        width: 50%;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background-color: rgba(238, 238, 238, 0.4);
    }
    .value.right-border {
        border-right: solid #000 2px;
    }
    .base-value {
        padding-inline: 5px;
        height: 30px;
        width: 100%;
        font-weight: 600;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
        background-color: rgba(0, 0, 0, 0.2);
        border-bottom: solid #000 2px;
        flex: 0 0 auto;
    }
    .text {
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
    }
    .empty-space {
        flex: 1 1 auto;
        background: repeating-linear-gradient(
            -45deg,
            rgba(0, 0, 0, 0.6),
            rgba(0, 0, 0, 0.6) 3px,
            rgba(0, 0, 0, 0.3) 3px,
            rgba(0, 0, 0, 0.3) 6px
        );
    }
    .add {
        width: 100%;
        height: 20px;
        background-color: rgba(0, 0, 0, 0.2);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 20px;
        cursor: pointer;
        flex: 0 0 auto;
        border-bottom: solid #000 2px;
        box-sizing: border-box;
        margin-bottom: -2px;
    }
    .add :global(svg) {
        height: 10px;
    }
</style>
