<script>
    import Node from "./Node.svelte";
    import Step from "./Step.svelte";
    import Sortable from "../lib/Sortable.svelte";
    import Icon from "../assets/icons/Icon.svelte";
    import { addHistory } from "../lib/workHistory";
    import { get } from "svelte/store";
    import { grabbing, reload } from "../lib/stores";
    import { currentFocus, focusData } from "../sidebar/editUtils";
    import { removeNodeWithHistory } from "../lib/syncData.svelte";

    let { sequence, isLastHold, onmousedown: bubbleMouseDown } = $props();

    function addStep() {
        if (get(grabbing)) return;
        sequence.steps.addWithHistory(addHistory, () => reload("nodeMoved"));
    }

    function onmousedown(evt) {
        bubbleMouseDown(evt);
        focusData("sequence", sequence);
    }

    const contextmenu = [
        { label: "플로우 실행", click: () => {} },
        { label: "단독 실행", click: () => {} },
        { type: "seperator" },
        { label: "복사", click: () => {} },
        { label: "붙여넣기", click: () => {} },
        { type: "seperator" },
        {
            label: "삭제",
            click: () => {
                removeNodeWithHistory(sequence);
                return true;
            }
        }
    ];
</script>

<Node
    node={sequence}
    outputs={[{ output: sequence.output, id: sequence.id }]}
    title={sequence.alias?.length ? sequence.alias : "이름 없는 시퀀스"}
    {isLastHold}
    {onmousedown}
    isFocused={$currentFocus.obj === sequence}
    {contextmenu}
>
    {#snippet body()}
        <div class="body">
            <Sortable
                Component={Step}
                sortable={sequence.steps}
                resized={() => {
                    reload("nodeMoved");
                }}
            />
            <div class="add" onclick={addStep}>
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
