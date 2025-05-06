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
    import { genClipboardFn } from "../lib/clipboard";
    import { removeNodeWithHistory } from "../lib/syncData.svelte";
    import { ipcRenderer } from "electron";

    let {
        node,
        type,
        outputs,
        innerOutputs = null,
        title,
        isLastHold,
        onmousedown: bubbleMouseDown,
        body,
        minWidth = 200
    } = $props();

    $effect(() => {
        title;
        reload("nodeMoved");
    });

    let nodeEl, handleEl;
    let grabber;

    let currentFocus;
    let isFocused = $state(false);

    const frameUpdater = new FrameUpdater(async () => {
        if (!nodeEl) return;
        nodeEl.style.left = `${node.nodePos.x}px`;
        nodeEl.style.top = `${node.nodePos.y}px`;
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
        })
    ];

    onMount(() => {
        applyNodePos();
        let movingNodes = null;
        let multipleGrabbing = false;
        grabber = new Grabber({
            container: nodeEl,
            handle: handleEl,
            onMoveStart: () => {
                if (currentFocus.type === "nodes") {
                    multipleGrabbing = true;
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

    function getFocusData() {
        return { type, obj: node, data: { clipboardFn } };
    }

    function onmousedown(evt) {
        if (evt.button || get(grabbing) === "viewport") return;
        focusData(type, node, { clipboardFn });
        bubbleMouseDown(evt);
    }

    const clipboardFn = genClipboardFn(type, node, () => removeNodeWithHistory(node), {
        excludes: [(type === "branch" || type === "entry") && "paste"]
    });

    const contextmenu = [
        {
            label: "실행",
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
                removeNodeWithHistory(node);
                return true;
            },
            action: "remove"
        }
    ].filter((t) => t);

    node.requestRect = () => nodeEl.getBoundingClientRect();
    node.applyNodePos = applyNodePos;
    node.getFocusData = getFocusData;

    onDestroy(() => {
        unsubs.forEach((us) => us());
        if (!node) return;

        if (currentFocus.obj === node) focusData("project");
        delete node.requestRect;
        delete node.applyNodePos;
        delete node.getFocusData;
    });
</script>

<div
    class="wrapper"
    class:last-hold={isLastHold}
    class:entry={type === "entry"}
    bind:this={nodeEl}
    onmousedowncapture={onmousedown}
    use:rightclick={contextmenu}
>
    <div class={["node", isFocused && "focus"]} style={`min-width: ${minWidth}px;`}>
        <div
            class="head"
            class:folded={folded && !innerOutputs?.length}
            use:inputNode={type !== "entry" && node.id}
        >
            <div class="handle" bind:this={handleEl}>
                <span>
                    {title}
                </span>
            </div>
            {#if type !== "entry"}
                <FoldArrow bind:folded toggle={() => reload("nodeMoved")} />
            {/if}
        </div>
        {#if !folded && type !== "entry"}
            {@render body()}
        {:else if innerOutputs?.length}
            <div class="inner-outputs">
                {#each innerOutputs as output}
                    <div class="right-output-wrapper">
                        <div
                            class="output right"
                            use:outputNode={{ isHeadingBottom: false, ...output }}
                        ></div>
                    </div>
                {/each}
            </div>
        {/if}
        {#if type !== "entry"}
            <div class="start-circle" use:inputNode={node.id}></div>
        {/if}
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
        top: 6px;
        left: -8px;
        background-color: #fff;
        width: 16px;
        height: 16px;
        border: solid #000 4px;
        border-radius: 50%;
        box-sizing: border-box;
    }
    .outputs {
        position: absolute;
        height: 14px;
        bottom: -14px;
        width: 100%;
        display: flex;
        flex-direction: row-reverse;
        justify-content: space-between;
        padding-inline: 10px;
        box-sizing: border-box;
    }
    .entry .outputs {
        justify-content: center;
    }
    .output {
        background-color: #000;
        width: 14px;
        height: 14px;
        border-radius: 0 0 7px 7px;
        cursor: grab;
        position: relative;
    }
    .output-label {
        opacity: 0.8;
        width: 30px;
        text-align: center;
        position: absolute;
        left: 50%;
        bottom: 100%;
        transform: translate(-50%, -5px);
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
        gap: 10px;
        padding-bottom: 10px;
        margin-top: -1px;
    }
    .right-output-wrapper {
        position: relative;
        height: 14px;
    }
    .output.right {
        position: absolute;
        right: -14px;
        border-radius: 0 7px 7px 0;
    }
</style>
