<script>
    import { onDestroy } from "svelte";
    import Icon from "../../assets/icons/Icon.svelte";
    import { outClicked, rightclick } from "../../lib/contextMenu/contextUtils";
    import { ValueProcessTypes } from "../../lib/translate";
    import { currentFocus, focusData } from "../../sidebar/editUtils";
    import { get } from "svelte/store";
    import { grabbing } from "../../lib/stores";

    let { item: valueProcess, handle = $bindable(null), el = $bindable(null), remove } = $props();

    onDestroy(() => {
        if (get(currentFocus).obj === valueProcess) {
            focusData("project");
        }
    });

    const contextmenu = [
        { label: "잘라내기", click: () => {} },
        { label: "복사", click: () => {} },
        { label: "붙여넣기", click: () => {} },
        { type: "seperator" },
        {
            label: "삭제",
            click: () => {
                remove();
                return true;
            }
        }
    ];
</script>

<div
    class={["value-process", $currentFocus.obj === valueProcess && "focus"]}
    bind:this={el}
    onmousedown={(evt) => {
        if (evt.button || get(grabbing)) return;
        evt.stopPropagation();
        focusData("valueProcess", valueProcess);
        outClicked();
    }}
    use:rightclick={contextmenu}
>
    <div class="info">
        <div class="handle" bind:this={handle}>
            <Icon icon="hamburger" color="rgba(0, 0, 0, 0.5)" size={8} />
        </div>
        <span>
            {ValueProcessTypes[valueProcess.type] ?? "?"}
        </span>
    </div>
</div>

<style>
    .value-process {
        min-width: 100%;
        font-weight: 600;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
    }
    .handle {
        box-sizing: border-box;
        padding-inline: 6px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
    }
    .info {
        height: 30px;
        display: flex;
        flex-direction: row;
        align-items: center;
    }
</style>
