<script>
    import { get } from "svelte/store";
    import Icon from "../../assets/icons/Icon.svelte";
    import Sortable from "../../lib/Sortable.svelte";
    import { BaseValueTypes } from "../../lib/translate";
    import ValueProcess from "./ValueProcess.svelte";
    import { grabbing, reload } from "../../lib/stores";
    import { addHistory } from "../../lib/workHistory";
    import { currentFocus, focusData } from "../../sidebar/editUtils";
    import { outClicked, rightclick } from "../../lib/contextMenu/contextUtils";
    import { onDestroy } from "svelte";
    import registerHighlight from "../../lib/highlight";
    import { genClipboardFn } from "../../lib/clipboard";
    import { removeNodeWithHistory } from "../../lib/syncData.svelte";

    let { value, pre, isValueA = false, parent } = $props();

    $effect(() => {
        value.baseValue;
        reload("nodeMoved");
    });

    function addProcess(evt) {
        if (get(grabbing)) return;
        evt.stopPropagation();
        const newProcess = value.process.addWithHistory(addHistory, {
            afterChange: () => reload("nodeMoved")
        });
        const newClipboardFn = genClipboardFn("valueProcess", newProcess, () =>
            value.process.removeWithHistory(newProcess, addHistory, () => reload("nodeMoved"))
        );
        focusData("valueProcess", newProcess, { clipboardFn: newClipboardFn });
    }

    function clickBase(evt) {
        if (evt.button || get(grabbing)) return;
        evt.stopPropagation();
        focusData("value", value);
        outClicked();
    }

    onDestroy(() => {
        if (get(currentFocus).obj === value) focusData("project");
    });

    // Too many bugs begin occurred, may be fix later
    // let clipboardFn;
    // function reloadClipboardFn() {
    //     clipboardFn = genClipboardFn("value", value, () => removeNodeWithHistory(value), {
    //         pasteData: {
    //             parent,
    //             isValueA
    //         },
    //         afterPasteChange: () => {
    //             reloadClipboardFn();
    //         }
    //     });
    // }
    // reloadClipboardFn();

    // const contextmenu = [
    //     {
    //         label: "복사",
    //         click: () => clipboardFn.copy()
    //     },
    //     {
    //         label: "붙여넣기",
    //         click: () => clipboardFn.paste()
    //     }
    // ];

    let hlActive = $derived(!!(value.baseType === "variable" && value.baseValue));
</script>

<div class={["value-wrapper", isValueA && "right-border"]}>
    <div
        class={["value", $currentFocus.obj === value && "focus"]}
        onmousedown={clickBase}
        use:registerHighlight={{ type: "variable", data: value.baseValue, active: hlActive }}
    >
        <div class="base-value">
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
            pretty
            resized={() => {
                reload("nodeMoved");
            }}
        />
        <div class="add" onmousedown={addProcess}>
            <Icon color="#000" lineWidth={2} />
        </div>
        <div class="empty-space"></div>
    </div>
</div>

<style>
    .value-wrapper {
        width: 50%;
        flex: 1 1 auto;
    }
    .value-wrapper.right-border {
        border-right: solid #000 2px;
    }
    .value {
        height: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background-color: rgba(238, 238, 238, 0.4);
    }
    .base-value {
        height: 30px;
        border-bottom: solid #000 2px;
        padding-inline: 5px;
        width: 100%;
        font-weight: 600;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
        background-color: rgba(0, 0, 0, 0.2);
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
