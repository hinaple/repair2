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
    import { pasted } from "../../lib/clipboard";
    import { genClipboardFn } from "../../lib/clipboard";
    import { startMonitoring } from "../../lib/runtimeMonitor.svelte";

    let { payload: compTemp, noGrab = false, nodeCountChanged } = $props();
    // svelte-ignore state_referenced_locally
    const comp = compTemp;

    $effect(() => {
        comp.alias;
        reload("nodeMoved");
    });

    function onpointerdown(evt) {
        if (evt.button || $grabbing) return;
        evt.stopPropagation();
        focusData("component", comp, {
            preview: comp,
            clipboardFn: {
                paste: () => pasted({ type: "component", obj: comp })
            }
        });
        outClicked();
    }

    function addElement(evt) {
        if (evt.button || $grabbing) return;
        evt.stopPropagation();
        const newElement = comp.elements.addWithHistory(addHistory, {
            afterChange: () => reload("nodeMoved")
        });
        const newClipboardFn = genClipboardFn("element", newElement, () =>
            comp.elements.removeWithHistory(newElement, addHistory, () => reload("nodeMoved"))
        );
        focusData("element", newElement, { clipboardFn: newClipboardFn, preview: comp });
    }

    let activated = $state(false);
    startMonitoring("components", comp.id, (status) => (activated = status));

    onDestroy(() => {
        if (get(currentFocus).obj === comp) focusData("project");
    });
</script>

<div
    class={["component", $currentFocus.obj === comp && "focus", activated && "activated"]}
    {onpointerdown}
>
    <div class="head">
        <span>
            {comp.alias?.length ? comp.alias : "이름 없는 컴포넌트"}
        </span>
        <div class="add" onpointerdown={addElement}>
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
            parent={comp}
        />
    </div>
</div>

<style>
    .component {
        width: 100%;
        box-sizing: border-box;
        background-color: var(--b-o2);
    }
    .component.activated {
        background-color: rgba(228, 112, 45, 0.6);
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
        background-color: var(--b-o1);
    }
</style>
