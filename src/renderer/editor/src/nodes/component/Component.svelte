<script>
    import { get } from "svelte/store";
    import { grabbing, reload } from "../../lib/stores";
    import { outClicked } from "../../lib/contextMenu/contextUtils";
    import { currentFocus, focusData } from "../../sidebar/editUtils";
    import Icon from "../../assets/icons/Icon.svelte";
    import { addHistory } from "../../lib/workHistory";
    import Sortable from "../../lib/Sortable.svelte";
    import Element from "./Element.svelte";
    import { onDestroy } from "svelte";

    let { payload: compTemp, noGrab = false, nodeCountChanged } = $props();
    const comp = compTemp;

    $effect(() => {
        comp.alias;
        reload("nodeMoved");
    });

    function onmousedown(evt) {
        if (evt.button || get(grabbing)) return;
        evt.stopPropagation();
        focusData("component", comp);
        outClicked();
    }

    function addElement(evt) {
        if (get(grabbing)) return;
        focusData(
            "element",
            comp.elements.addWithHistory(addHistory, () => reload("nodeMoved"))
        );
        evt.stopPropagation();
    }

    onDestroy(() => {
        if (get(currentFocus).obj === comp) focusData("project");
    });
</script>

<div class={["component", $currentFocus.obj === comp && "focus"]} {onmousedown}>
    <div class="head">
        <span>
            {comp.alias?.length ? comp.alias : "이름 없는 컴포넌트"}
        </span>
        <div class="add" onmousedown={addElement}>
            <Icon lineWidth={2} size={7} />
        </div>
    </div>
    <div class="elements">
        <Sortable
            sortable={comp.elements}
            Component={Element}
            style="enum"
            resized={() => reload("nodeMoved")}
            onmoved={() => reload("nodeMoved")}
            {noGrab}
            {nodeCountChanged}
        />
    </div>
</div>

<style>
    .component {
        width: 100%;
        box-sizing: border-box;
        background-color: rgba(0, 0, 0, 0.2);
    }
    .head {
        padding-left: 10px;
        height: 25px;
        font-size: 12px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
    .add {
        flex: 0 0 auto;
        width: 25px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }
    .add:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }
</style>
