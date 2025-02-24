<script>
    import { get } from "svelte/store";
    import { grabbing, reload } from "../../lib/stores";
    import { outClicked } from "../../lib/contextMenu/contextUtils";
    import { currentFocus, focusData } from "../../sidebar/editUtils";
    import Icon from "../../assets/icons/Icon.svelte";
    import { addHistory } from "../../lib/workHistory";
    import Sortable from "../../lib/Sortable.svelte";

    let { payload: comp, resized } = $props();

    $effect(() => {
        comp.alias;
        if (resized) resized();
    });

    function onmousedown(evt) {
        if (evt.button || get(grabbing)) return;
        evt.stopPropagation();
        focusData("component", comp);
        outClicked();
    }

    function addElement() {
        if (get(grabbing)) return;
        comp.elements.addWithHistory(addHistory, () => reload("nodeMoved"));
    }
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
        <Sortable />
        {#each comp.elements.list as element}
            <div class="element">{element}</div>
        {/each}
    </div>
</div>

<style>
    .component {
        width: 100%;
        box-sizing: border-box;
        padding-left: 10px;
        background-color: rgba(0, 0, 0, 0.2);
    }
    .head {
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
