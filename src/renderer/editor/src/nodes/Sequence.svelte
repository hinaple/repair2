<script>
    import Node from "./Node.svelte";
    import Step from "./Step.svelte";
    import Sortable from "../lib/Sortable.svelte";
    import Icon from "../assets/icons/Icon.svelte";
    import { addHistory } from "../lib/workHistory";
    import { get } from "svelte/store";
    import { grabbing, reload } from "../lib/stores";
    import { focusData } from "../sidebar/editUtils";
    import { genClipboardFn } from "../lib/clipboard";

    let { sequence, isLastHold, onpointerdown, ...nodeData } = $props();

    function addStep(evt) {
        if (evt.button || $grabbing) return;
        evt.stopPropagation();
        const newStep = sequence.steps.addWithHistory(addHistory);
        const newClipboardFn = genClipboardFn("step", newStep, () =>
            sequence.steps.removeWithHistory(newStep, addHistory, () => reload("nodeMoved"))
        );
        focusData("step", newStep, { clipboardFn: newClipboardFn });
    }

    let innerOutputs = $state([]);
    function nodeCountChanged() {
        innerOutputs = [];
        sequence.steps.list
            .filter((s) => s.type === "Component.create")
            .forEach((s) => {
                s.payload.elements.list.forEach(
                    (e) => (innerOutputs = [...innerOutputs, ...e.listeners.list])
                );
            });
    }
    nodeCountChanged();
</script>

<Node
    node={sequence}
    type="sequence"
    outputs={[{ output: sequence.output, id: sequence.id }]}
    {innerOutputs}
    title={sequence.alias?.length ? sequence.alias : "시퀀스"}
    {isLastHold}
    {onpointerdown}
    {...nodeData}
>
    {#snippet body()}
        <div class="body">
            <Sortable
                Component={Step}
                sortable={sequence.steps}
                pretty
                resized={() => {
                    reload("nodeMoved");
                }}
                onmoved={() => reload("nodeMoved")}
                {nodeCountChanged}
            />
            <div class="add" onpointerdown={addStep}>
                <Icon color="#fff" lineWidth={2} />
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
        background-color: rgba(238, 238, 238, 0.4);
    }
    .add {
        width: 100%;
        height: 15px;
        background-color: #000;
        border-radius: 0 0 8px 8px;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 20px;
        cursor: pointer;
    }
    .add :global(svg) {
        height: 10px;
    }
</style>
