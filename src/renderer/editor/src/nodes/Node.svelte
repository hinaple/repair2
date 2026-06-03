<script>
    import { onDestroy, onMount } from "svelte";
    import Grabber from "../lib/grabber";
    import inputNode from "./lines/input";
    import { grabbing, reload, sequenceMovedReloader } from "../lib/stores";
    import FoldArrow from "../lib/FoldArrow.svelte";
    import { addHistory } from "../lib/workHistory";
    import { get } from "svelte/store";
    import { rightclick } from "../lib/contextMenu/contextUtils";
    import outputNode from "./lines/output";
    import FrameUpdater from "../lib/frameUpdater";
    import { currentFocus as CurrentFocus, focusData } from "../sidebar/editUtils";
    import { appData } from "../lib/syncData.svelte";
    import { ipcRenderer } from "electron";

    let {
        node,
        type,
        outputs,
        innerOutputs = null,
        title,
        isLastHold,
        onpointerdown: bubbleMouseDown,
        body,
        minWidth = 200,
        hasInput = true,
        color = "#000"
    } = $props();

    $effect(() => {
        title;
        reload("nodeMoved");
    });

    const clipboardFn = node.clipboardFn;

    let nodeEl, handleEl;
    let grabber;

    let currentFocus;
    let isFocused = $state(false);

    const frameUpdater = new FrameUpdater(async () => {
        if (!nodeEl) return;
        nodeEl.style.transform = `translate(${node.nodePos.x}px, ${node.nodePos.y}px)`;
    }, 0);
    function applyNodePos() {
        frameUpdater.draw();
    }
    const unsubs = [
        sequenceMovedReloader.subscribe(() => {
            applyNodePos();
        }),
        CurrentFocus.subscribe((cf) => {
            currentFocus = cf;
            isFocused =
                cf.obj === node || (cf.type === "nodes" && cf.arr.some((n) => n.obj === node));
        }),
        () => grabber?.destroy?.()
    ];

    onMount(() => {
        applyNodePos();
        let movingNodes = null;
        grabber = new Grabber({
            container: nodeEl,
            handle: handleEl,
            onMoveStart: () => {
                if (currentFocus.type === "nodes") {
                    movingNodes = currentFocus.arr.map((n) => ({
                        node: n.obj,
                        from: {
                            x: n.obj.nodePos.x,
                            y: n.obj.nodePos.y
                        }
                    }));
                } else
                    movingNodes = [
                        {
                            node,
                            from: {
                                x: node.nodePos.x,
                                y: node.nodePos.y
                            }
                        }
                    ];
            },
            onMoved: ({ dx, dy }) => {
                movingNodes.forEach(({ node, to }, i) => {
                    node.nodePos.x += dx;
                    node.nodePos.y += dy;
                    node.applyNodePos();
                });
                reload("sequenceMoved");
            },
            onMoveEnd: (moved) => {
                if (!moved) return;
                addHistory({
                    doFn: (arr) => {
                        arr.forEach(({ node, x, y }) => {
                            node.nodePos.x = x;
                            node.nodePos.y = y;
                            node.applyNodePos();
                        });
                        reload("sequenceMoved");
                    },
                    doData: movingNodes.map((p) => ({
                        node: p.node,
                        x: p.node.nodePos.x,
                        y: p.node.nodePos.y
                    })),
                    undoData: movingNodes.map((p) => ({
                        node: p.node,
                        x: p.from.x,
                        y: p.from.y
                    }))
                });
            }
        });
        reload("sequenceMoved");
    });

    let folded = $state(node.folded);
    $effect(() => {
        node.folded = folded;
    });

    function onpointerdown(evt) {
        if (evt.button || get(grabbing) === "viewport") return;
        focusData(type, node, { clipboardFn });
        bubbleMouseDown(evt);
    }

    const contextmenu = [
        type === "entry" && {
            label: "실행",
            click: () => {
                ipcRenderer.send("request-execute", { type: "entry", id: node.id });
                return true;
            }
        },
        (type !== "entry" || node.standbyMode) && {
            label: type === "entry" ? "활성화" : "실행",
            click: () => {
                ipcRenderer.send("request-execute", { type: "node", id: node.id });
                return true;
            }
        },
        { type: "seperator" },
        {
            label: "잘라내기",
            click: clipboardFn.cut
        },
        {
            label: "복사",
            click: clipboardFn.copy
        },
        type === "sequence" && {
            label: "붙여넣기",
            click: clipboardFn.paste
        },
        { type: "seperator" },
        {
            label: "삭제",
            click: () => {
                appData.removeNode(node);
                return true;
            },
            action: "remove"
        }
    ].filter((t) => t);

    node.requestRect = () => nodeEl.getBoundingClientRect();
    node.applyNodePos = applyNodePos;

    onDestroy(() => {
        unsubs.forEach((us) => us?.());
        if (!node) return;

        if (isFocused) focusData("project");
        delete node.requestRect;
        delete node.applyNodePos;
    });
</script>

<div
    class={[
        "wrapper",
        isLastHold && "last-hold",
        type === "entry" && "entry",
        type === "branch" && "branch"
    ]}
    bind:this={nodeEl}
    onpointerdowncapture={onpointerdown}
    use:rightclick={contextmenu}
>
    <div class="node-wrapper" style={`--node-color: ${color};`}>
        <div
            class={["node", isFocused && "focus"]}
            id={node.id}
            style={`min-width: ${minWidth}px;`}
        >
            <div
                class="head"
                class:folded={folded && !innerOutputs?.length}
                use:inputNode={{ hasInput, id: node.id }}
            >
                <div class="handle" bind:this={handleEl}>
                    <span>
                        {title}
                    </span>
                </div>
                {#if type !== "entry" && type !== "branch"}
                    <FoldArrow bind:folded toggle={() => reload("nodeMoved")} />
                {/if}
            </div>
            {#if !folded && type !== "entry" && type !== "entry"}
                {@render body()}
            {:else if innerOutputs?.length}
                <div class="inner-outputs">
                    {#each innerOutputs as output}
                        <div class="right-output-wrapper">
                            <div class="right-output" use:outputNode={output}></div>
                        </div>
                    {/each}
                </div>
            {/if}
            {#if hasInput}
                <div class="start-circle" use:inputNode={node.id}></div>
            {/if}
        </div>
        <div class="outputs">
            {#each outputs as output}
                <div class="output" use:outputNode={output}>
                    {#if !folded && output.label}
                        <div class="output-label">{output.label}</div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .wrapper {
        position: absolute;
        border-radius: 10px;
    }
    .wrapper.last-hold {
        z-index: 2;
    }
    .node-wrapper {
        display: flex;
        flex-direction: row;
        pointer-events: all;
    }
    .node {
        min-width: 200px;
        display: flex;
        flex-direction: column;
        box-shadow: var(--b-o3) 3px 3px 4px;
        border-radius: 10px;
        left: 0;
        top: 0;
        background-color: var(--w-o8);
    }
    .head {
        color: #fff;
        flex: 0 0 auto;
        background-color: var(--node-color);
        cursor: grab;
        font-weight: 600;
        display: flex;
        flex-direction: row;
        height: 30px;
        box-sizing: border-box;
        border-radius: 10px 10px 0 0;
    }
    .entry .head {
        border-radius: 10px;
        height: 45px;
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
    .entry .handle {
        padding-inline: 13px;
        text-align: center;
        font-weight: 700;
        font-size: 20px;
    }
    .start-circle {
        position: absolute;
        top: 7px;
        left: -8px;
        background-color: #fff;
        width: 16px;
        height: 16px;
        border: solid var(--node-color) 4px;
        border-radius: 50%;
        box-sizing: border-box;
    }
    .entry .start-circle {
        top: calc(calc(45px - 16px) / 2);
    }
    .outputs {
        right: -14px;
        position: absolute;
        height: 30px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
        justify-content: space-evenly;
    }
    .branch .outputs {
        bottom: 2px;
        height: 60px;
    }
    .entry .outputs {
        height: 100%;
    }
    .output {
        position: relative;
        left: -2px;
        cursor: grab;
        background-color: #fff;
        width: 16px;
        height: 16px;
        border: solid var(--node-color) 4px;
        border-radius: 50%;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-self: center;
    }
    .output-label {
        opacity: 0.8;
        width: 30px;
        text-align: right;
        position: absolute;
        left: -5px;
        transform: translateX(-100%);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        pointer-events: none;
    }
    .inner-outputs {
        display: flex;
        flex-direction: column;
        background-color: #000;
        border-radius: 0 0 10px 10px;
        width: 100%;
        gap: 8px;
        padding-block: 5px 10px;
        margin-top: -1px;
    }
    .right-output-wrapper {
        width: 100%;
        position: relative;
        height: 14px;
    }
    .right-output {
        background-color: #000;
        width: 14px;
        height: 14px;
        border-radius: 0 7px 7px 0;
        border-radius: 50%;
        position: absolute;
        right: -14px;
        border-radius: 0 7px 7px 0;
    }
</style>
