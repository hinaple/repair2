<script>
    import { onDestroy, onMount } from "svelte";
    import Step from "./Step.svelte";
    import Grabber from "../lib/grabber";
    import Output from "./lines/Output.svelte";
    import inputNode from "./lines/input";
    import { grabbing, reload, sequenceMovedReloader } from "../lib/stores";
    import FoldArrow from "../lib/FoldArrow.svelte";
    import { addHistory } from "../lib/workHistory";
    import Plus from "../assets/icons/Icon.svelte";
    import Sortable from "../lib/Sortable.svelte";
    import reorder from "../lib/reorder";
    import { currentFocus, focusData } from "../sidebar/editUtils";
    import { get } from "svelte/store";
    import { rightclick } from "../lib/contextMenu/contextUtils";
    import StepClass from "@classes/step.svelte";
    import { appData } from "../lib/syncData.svelte";
    import { getAllConnectedNodes, setAllOutput } from "./lines/line";
    import { blur } from "svelte/transition";
    import { quintOut } from "svelte/easing";

    let { sequence, isLastHold, onmousedown: bubbleMouseDown } = $props();
    let nodeEl, handleEl;

    let grabber;

    let outputRendering = $state(false);

    function applyNodePos() {
        if (!nodeEl) return;
        nodeEl.style.left = `${sequence.nodePos.x}px`;
        nodeEl.style.top = `${sequence.nodePos.y}px`;
        outputRendering = true;
    }
    const unsub = sequenceMovedReloader.subscribe(() => {
        applyNodePos();
    });
    onDestroy(() => {
        unsub();
        if (get(currentFocus).obj === sequence) {
            focusData("project");
        }
    });

    onMount(() => {
        applyNodePos();
        let prvPos = null;
        grabber = new Grabber({
            container: nodeEl,
            handle: handleEl,
            onMoveStart: () => (prvPos = { x: sequence.nodePos.x, y: sequence.nodePos.y }),
            onMoved: ({ dx, dy }) => {
                sequence.nodePos.x += dx;
                sequence.nodePos.y += dy;
                applyNodePos();
                reload("sequenceMoved");
            },
            onMoveEnd: (moved) => {
                if (!moved) return;
                addHistory({
                    doFn: (pos) => {
                        sequence.nodePos.x = pos.x;
                        sequence.nodePos.y = pos.y;
                        applyNodePos();
                        reload("sequenceMoved");
                    },
                    doData: { x: sequence.nodePos.x, y: sequence.nodePos.y },
                    undoData: { x: prvPos.x, y: prvPos.y }
                });
            }
        });
    });

    let displayStepArr = $derived(sequence.steps.map((d) => d));

    function addStep() {
        if (get(grabbing)) return;
        let tempStep = new StepClass();
        addHistory({
            doFn: ({ tempSeq, tempStep }) => {
                tempSeq.addStep(tempStep);
                reload("sequenceMoved");
            },
            undoFn: ({ tempSeq, idx }) => {
                tempSeq.removeStep(idx);
                reload("sequenceMoved");
            },
            doData: { tempSeq: sequence, tempStep },
            undoData: { tempSeq: sequence, idx: sequence.steps.length }
        });
    }

    let folded = $state(sequence.folded);
    $effect(() => {
        sequence.folded = folded;
    });

    function reorderSteps({ from, to }) {
        addHistory({
            doFn: ([a, b]) => {
                sequence.steps = reorder(sequence.steps, a, b);
            },
            doData: [from, to],
            undoData: [to, from]
        });
    }

    function onmousedown(evt) {
        if (evt.button || get(grabbing) === "viewport") return;
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
                const currentIdx = appData.nodes.findIndex((s) => s.id === sequence.id);
                const connectedNodes = getAllConnectedNodes(sequence.id);
                addHistory({
                    doFn: ({ idx, nodes }) => {
                        appData.sequences.splice(idx, 1);
                        setAllOutput(nodes, null);
                        reload("sequenceMoved");
                    },
                    undoFn: ({ seq, idx, nodes }) => {
                        appData.sequences.splice(idx, 0, seq);
                        setAllOutput(nodes, seq.id);
                        reload("sequenceMoved");
                    },
                    doData: { idx: currentIdx, nodes: connectedNodes },
                    undoData: { seq: sequence, idx: currentIdx, nodes: connectedNodes }
                });
                return true;
            }
        }
    ];
</script>

<div
    class="wrapper"
    class:last-hold={isLastHold}
    bind:this={nodeEl}
    {onmousedown}
    use:rightclick={contextmenu}
    out:blur={{ duration: 400, amount: 2, easing: quintOut }}
>
    <div class={["node", $currentFocus.obj === sequence && "focus"]}>
        <div class="head" class:folded use:inputNode={sequence.id}>
            <div class="handle" bind:this={handleEl}>
                <span>
                    {sequence.alias?.length ? sequence.alias : "이름 없는 시퀀스"}
                </span>
            </div>
            <FoldArrow bind:folded toggle={() => reload("sequenceMoved")} />
        </div>
        {#if !folded}
            <div class="body">
                {#key displayStepArr}
                    <Sortable
                        Component={Step}
                        list={displayStepArr}
                        change={reorderSteps}
                        {sequence}
                        resized={() => {
                            reload("sequenceMoved");
                        }}
                    />
                {/key}
                <div class="add" onclick={addStep}>
                    <Plus color="#fff" lineWidth={2} />
                </div>
            </div>
        {/if}
        <div class="start-circle" use:inputNode={sequence.id}></div>
        <div class="end-circle">
            {#if outputRendering}
                {#key $sequenceMovedReloader}
                    <Output output={sequence.afterExecuted} id={sequence.id} />
                {/key}
            {/if}
        </div>
    </div>
</div>

<style>
    .wrapper {
        position: absolute;
        backdrop-filter: blur(1.3px);
        border-radius: 10px;
    }
    .wrapper.last-hold {
        z-index: 2;
    }
    .node {
        pointer-events: all;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        box-shadow: rgba(0, 0, 0, 0.3) 3px 3px 4px;
        border-radius: 10px;
    }
    .wrapper:global(.grabbing) {
        backdrop-filter: blur(2px);
    }
    .head {
        color: #fff;
        flex: 0 0 auto;
        background-color: #000;
        cursor: grab;
        font-weight: 600;
        display: flex;
        flex-direction: row;
        height: 30px;
        box-sizing: border-box;
        border-radius: 10px 10px 0 0;
    }
    .head.folded {
        border-radius: 10px;
    }
    .handle {
        padding-left: 13px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
        flex: 1 1 auto;
        overflow: hidden;
        white-space: pre;
    }
    .body {
        display: flex;
        flex-direction: column;
        border: solid #000 2px;
        border-top-width: 0;
        box-sizing: border-box;
        border-radius: 0 0 10px 10px;
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
    .start-circle {
        position: absolute;
        top: 6px;
        left: -8px;
        background-color: #fff;
        width: 16px;
        height: 16px;
        border: solid #000 4px;
        border-radius: 50%;
        box-sizing: border-box;
    }
    .end-circle {
        position: absolute;
        bottom: -14px;
        right: 10px;
        background-color: #000;
        width: 14px;
        height: 14px;
        border-radius: 0 0 7px 7px;
    }
</style>
