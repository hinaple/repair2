<script>
    import { onDestroy, onMount } from "svelte";
    import Background from "./Background.svelte";
    import {
        viewport,
        rInfo,
        resizeViewport,
        moveViewport,
        posFromViewport,
        getOriginalPos
    } from "./viewport";
    import Sequence from "./Sequence.svelte";
    import { grabbing } from "../lib/stores";
    import { get } from "svelte/store";
    import Lines from "./lines/Lines.svelte";
    import { appData } from "../lib/syncData.svelte";
    import { focusData, selectManyNodes } from "../sidebar/editUtils";
    import { rightclick } from "../lib/contextMenu/contextUtils";
    import SequenceClass from "@classes/nodes/sequence.svelte";
    import BranchClass from "@classes/nodes/branch.svelte";
    import EntryClass from "@classes/nodes/entry.svelte";
    import VariableSetClass from "@classes/nodes/variableSet.svelte";
    import Branch from "./Branch.svelte";
    import Entry from "./Entry.svelte";
    import { pasted } from "../lib/clipboard";
    import { fade } from "svelte/transition";
    import FrameUpdater from "../lib/frameUpdater";
    import VariableSet from "./VariableSet.svelte";
    import LinesOld from "./lines/LinesOld.svelte";

    let readyToGrab = $state(false);
    function keydown(evt) {
        if (evt.target.tagName === "INPUT" || evt.target.tagName === "TEXTAREA") return;
        if (evt.key === " " && !get(grabbing)) {
            readyToGrab = true;
            grabbing.set(myGrab);
        }

        // if (evt.key === "Tab") {
        //     renderWithWebGL = !renderWithWebGL;
        //     console.log("TOGGLE LINE RENDERER: ", renderWithWebGL ? "WebGL" : "Canvas");
        // }
    }
    function keyup(evt) {
        if (evt.key === " ") {
            readyToGrab = false;
            if (get(grabbing) === myGrab) grabbing.set(null);
        }
        if (evt.key === "Alt") evt.preventDefault();
    }

    const myGrab = "viewport";
    let realGrabbing = $state(false);
    let prvMouse = null;
    let selectOrigin = $state(null);
    let selectBoxEl = $state(null);
    function pointerdown(evt) {
        if (evt.button === 0 && !readyToGrab && !get(grabbing)) {
            selectOrigin = { x1: evt.clientX, y1: evt.clientY };
        }

        if (!((evt.button === 0 && readyToGrab) || (evt.button === 1 && !get(grabbing)))) {
            if (!evt.button && !get(grabbing)) focusData("project");
            return;
        }
        grabbing.set(myGrab);
        realGrabbing = true;
        prvMouse = { x: evt.screenX, y: evt.screenY };
    }
    function pointermove(evt) {
        if (selectOrigin) {
            if (get(grabbing) !== "select") grabbing.set("select");

            selectOrigin.x2 = evt.clientX;
            selectOrigin.y2 = evt.clientY;
            selectBoxEl.style.display = "block";
            selectBoxEl.style.left = `${Math.min(selectOrigin.x1, selectOrigin.x2)}px`;
            selectBoxEl.style.top = `${Math.min(selectOrigin.y1, selectOrigin.y2)}px`;
            selectBoxEl.style.width = `${Math.abs(selectOrigin.x1 - selectOrigin.x2)}px`;
            selectBoxEl.style.height = `${Math.abs(selectOrigin.y1 - selectOrigin.y2)}px`;
            return;
        }

        if (!realGrabbing) return;

        moveViewport(-evt.screenX + prvMouse.x, -evt.screenY + prvMouse.y);
        prvMouse = { x: evt.screenX, y: evt.screenY };
    }
    function pointerup(evt) {
        if (selectOrigin) {
            if (selectOrigin.x2) {
                const area = {
                    x1: Math.min(selectOrigin.x1, selectOrigin.x2),
                    y1: Math.min(selectOrigin.y1, selectOrigin.y2),
                    x2: Math.max(selectOrigin.x1, selectOrigin.x2),
                    y2: Math.max(selectOrigin.y1, selectOrigin.y2)
                };
                selectManyNodes(
                    appData.nodes
                        .values()
                        .filter((node) => {
                            const rect = node.requestRect();
                            return (
                                rect &&
                                area.x1 < rect.left &&
                                area.x2 > rect.right &&
                                area.y1 < rect.top &&
                                area.y2 > rect.bottom
                            );
                        })
                        .toArray()
                );
            }
            selectOrigin = null;
            grabbing.set(null);
            return;
        }
        if (!realGrabbing || evt.button === 2) return;
        if (!readyToGrab) grabbing.set(null);
        realGrabbing = false;
    }

    function wheel(evt) {
        if (get(grabbing)) return;
        const dir = Math.abs(evt.deltaY) / evt.deltaY;
        if (isNaN(dir)) return;
        if (evt.ctrlKey || evt.shiftKey)
            moveViewport(evt.ctrlKey ? dir * 15 : 0, evt.shiftKey ? dir * 15 : 0);
        else resizeViewport(-dir, { x: evt.clientX, y: evt.clientY });
    }

    let viewportEl = $state(null);

    const frameUpdater = new FrameUpdater(() => {
        if (!viewportEl) return;
        const tempPos = posFromViewport(0, 0);
        viewportEl.style.transform = `translate(${tempPos.x}px, ${tempPos.y}px) scale(${rInfo.ratio})`;
    });

    function onMoved() {
        if (!viewportEl) return;
        frameUpdater.draw();
    }
    const unsubs = [viewport.screen.subscribe(onMoved), viewport.pos.subscribe(onMoved)];

    onMount(() => {
        frameUpdater.draw();
    });

    onDestroy(() => {
        unsubs.forEach((u) => u());
    });

    let lastHold = $state(null);

    const contextmenu = [
        {
            label: "새 진입점",
            click: ({ pos: { x, y } }) => {
                const entry = new EntryClass({ nodePos: getOriginalPos(x, y) });
                focusData("entry", entry, { clipboardFn: entry.clipboardFn });
                appData.addNode(entry);
                return true;
            }
        },
        {
            label: "새 시퀀스",
            click: ({ pos: { x, y } }) => {
                const seq = new SequenceClass({ nodePos: getOriginalPos(x, y) });
                focusData("sequence", seq, { clipboardFn: seq.clipboardFn });
                appData.addNode(seq);
                return true;
            }
        },
        {
            label: "새 분기점",
            click: ({ pos: { x, y } }) => {
                const branch = new BranchClass({ nodePos: getOriginalPos(x, y) });
                focusData("branch", branch, { clipboardFn: branch.clipboardFn });
                appData.addNode(branch);
                return true;
            }
        },
        {
            label: "새 변수설정",
            click: ({ pos: { x, y } }) => {
                const variableSet = new VariableSetClass({ nodePos: getOriginalPos(x, y) });
                focusData("variableSet", variableSet, { clipboardFn: variableSet.clipboardFn });
                appData.addNode(variableSet);
                return true;
            }
        },
        { type: "seperator" },
        {
            label: "붙여넣기",
            click: ({ pos: { x, y } }) => {
                pasted({ type: "project" }, getOriginalPos(x, y));
                return true;
            }
        }
    ];

    let renderWithWebGL = $state(true);
    function unsupported() {
        renderWithWebGL = false;
    }
</script>

<svelte:body
    onkeydown={keydown}
    onkeyup={keyup}
    onpointermove={pointermove}
    onpointerup={pointerup}
/>
<div
    class="node-space"
    class:grabbing={realGrabbing}
    class:ready-to-grab={readyToGrab}
    onpointerdown={pointerdown}
    onwheel={wheel}
    use:rightclick={contextmenu}
>
    <Background />
    <div class="viewport" bind:this={viewportEl}>
        {#each appData.nodes.values() as node (node.id)}
            {#if node.type === "sequence"}
                <Sequence
                    sequence={node}
                    isLastHold={node.id === lastHold}
                    onpointerdown={() => (lastHold = node.id)}
                />
            {:else if node.type === "branch"}
                <Branch
                    branch={node}
                    isLastHold={node.id === lastHold}
                    onpointerdown={() => (lastHold = node.id)}
                />
            {:else if node.type === "entry"}
                <Entry
                    entry={node}
                    isLastHold={node.id === lastHold}
                    onpointerdown={() => (lastHold = node.id)}
                />
            {:else if node.type === "variableSet"}
                <VariableSet
                    variableSet={node}
                    isLastHold={node.id === lastHold}
                    onpointerdown={() => (lastHold = node.id)}
                />
            {/if}
        {/each}
    </div>
    {#if renderWithWebGL}
        <Lines {unsupported} />
    {:else}
        <LinesOld />
    {/if}
</div>
{#if selectOrigin}
    <div
        class="select-box"
        bind:this={selectBoxEl}
        style={`left: ${selectOrigin.x1}px; top: ${selectOrigin.y1}px;`}
        out:fade={{ duration: 80 }}
    ></div>
{/if}

<style>
    .node-space {
        width: 100%;
        height: 100%;
        position: absolute;
        left: 0;
        top: 0;
    }
    .node-space :global(*) {
        user-select: none;
    }
    .node-space.ready-to-grab,
    .node-space.ready-to-grab :global(*) {
        cursor: grab !important;
    }
    .node-space.grabbing,
    .node-space.grabbing :global(*) {
        cursor: grabbing !important;
    }
    .viewport {
        position: absolute;
        left: 0;
        top: 0;
        pointer-events: none;
        transform-origin: left top;
    }

    .select-box {
        position: fixed;
        pointer-events: none;
        width: 0;
        height: 0;
        background-color: #2b6eff4a;
        outline: solid 2px #2b6eff;
        display: none;
        border-radius: 2px;
    }
</style>
