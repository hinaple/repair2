<script>
    import { onDestroy } from "svelte";
    import Icon from "../../assets/icons/Icon.svelte";
    import { outClicked, rightclick } from "../../lib/contextMenu/contextUtils";
    import { currentFocus, focusData } from "../../sidebar/editUtils";
    import { get } from "svelte/store";
    import { grabbing, reload } from "../../lib/stores";
    import { ElementTypes } from "../../lib/translate";
    import Sortable from "../../lib/Sortable.svelte";
    import Listener from "./Listener.svelte";
    import { addHistory } from "../../lib/workHistory";
    import registerHighlight from "../../lib/highlight";

    let {
        item: element,
        handle = $bindable(null),
        el = $bindable(null),
        noGrab = false,
        remove,
        nodeCountChanged,
        parent
    } = $props();

    onDestroy(() => {
        if (get(currentFocus).obj === element) {
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
            },
            action: "remove"
        }
    ];

    function addListener(evt) {
        if (get(grabbing)) return;
        evt.stopPropagation();
        focusData(
            "listener",
            element.listeners.addWithHistory(addHistory, () => {
                reload("nodeMoved");
                if (nodeCountChanged) nodeCountChanged();
            })
        );
    }

    let hlData = $derived.by(() => {
        if (element.type === "input")
            return { type: "variable", data: element.payload?.variableId, active: true };
        if (element.type === "image" || element.type === "video")
            return { type: "resource", data: element.payload?.resourceId, active: true };
        return { active: false };
    });
</script>

<div
    class={["element", $currentFocus.obj === element && "focus"]}
    bind:this={el}
    onmousedown={(evt) => {
        if (evt.button || get(grabbing)) return;
        evt.stopPropagation();
        focusData("element", element, { preview: parent });
        outClicked();
    }}
    use:rightclick={contextmenu}
    use:registerHighlight={hlData}
>
    <div class="info">
        <div class="handle" bind:this={handle}>
            <Icon icon="hamburger" color="rgba(0, 0, 0, 0.5)" size={8} />
        </div>
        <div class="title">
            {element.alias?.length ? element.alias : ElementTypes[element.type]}
        </div>
        <div class="add" onmousedown={addListener}>
            <Icon icon="arrow" size={9} lineWidth={1.5} />
        </div>
    </div>
    <div class="listeners">
        <Sortable
            sortable={element.listeners}
            Component={Listener}
            style="listener"
            resized={() => reload("nodeMoved")}
            onmoved={() => reload("nodeMoved")}
            {noGrab}
            onremoved={nodeCountChanged}
        />
    </div>
</div>

<style>
    .element {
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
        font-size: 12px;
        height: 25px;
        display: flex;
        flex-direction: row;
        align-items: center;
    }
    .title {
        flex: 1 1 auto;
    }
    .add {
        height: 100%;
        width: 25px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        cursor: pointer;
    }
    .add:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }
</style>
