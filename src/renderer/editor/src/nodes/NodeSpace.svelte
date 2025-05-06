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
    import { addHistory } from "../lib/workHistory";
    import Branch from "./branch/Branch.svelte";
    import Entry from "./Entry.svelte";
    import { removeNodeWithHistory } from "../lib/syncData.svelte";
    import { genClipboardFn, pasted } from "../lib/clipboard";
    import { fade } from "svelte/transition";

    let readyToGrab = $state(false);
    function keydown(evt) {
        if (evt.target.tagName === "INPUT" || evt.target.tagName === "TEXTAREA") return;
        if (evt.key === " " && !get(grabbing)) {
            readyToGrab = true;
            grabbing.set(myGrab);
        }
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
    function mousedown(evt) {
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
    function mousemove(evt) {
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
    function mouseup(evt) {
        if (selectOrigin) {
            if (selectOrigin.x2) {
                const area = {
                    x1: Math.min(selectOrigin.x1, selectOrigin.x2),
                    y1: Math.min(selectOrigin.y1, selectOrigin.y2),
                    x2: Math.max(selectOrigin.x1, selectOrigin.x2),
                    y2: Math.max(selectOrigin.y1, selectOrigin.y2)
                };
                selectManyNodes(
                    appData.nodes.filter((node) => {
                        const rect = node.requestRect();
                        return (
                            rect &&
                            area.x1 < rect.left &&
                            area.x2 > rect.right &&
                            area.y1 < rect.top &&
                            area.y2 > rect.bottom
                        );
                    })
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
        if (evt.ctrlKey || evt.shiftKey) {
            moveViewport(evt.ctrlKey ? dir * 15 : 0, evt.shiftKey ? dir * 15 : 0);
        } else {
            resizeViewport(-dir, { x: evt.clientX, y: evt.clientY });
        }
    }

    let viewportEl = $state(null);

    function onResized() {
        if (!viewportEl) return;
        viewportEl.style.transform = `scale(${rInfo.ratio})`;
        onMoved();
    }
    function onMoved() {
        if (!viewportEl) return;
        const tempPos = posFromViewport(0, 0);
        viewportEl.style.left = `${tempPos.x}px`;
        viewportEl.style.top = `${tempPos.y}px`;
    }
    const unsubs = [viewport.screen.subscribe(onResized), viewport.pos.subscribe(onMoved)];

    onMount(() => {
        onResized();
    });

    onDestroy(() => {
        unsubs.forEach((u) => u());
    });

    let lastHold = $state(null);

    const contextmenu = [
        {
            label: "새 시퀀스",
            click: ({ pos: { x, y } }) => {
                const seq = new SequenceClass({ nodePos: getOriginalPos(x, y) });
                const clipboardFn = genClipboardFn("sequence", seq, () =>
                    removeNodeWithHistory(seq)
                );
                focusData("sequence", seq, { clipboardFn });
                appData.addNodeWithHistory(addHistory, seq);
                return true;
            }
        },
        {
            label: "새 분기점",
            click: ({ pos: { x, y } }) => {
                const branch = new BranchClass({ nodePos: getOriginalPos(x, y) });
                const clipboardFn = genClipboardFn("branch", branch, () =>
                    removeNodeWithHistory(branch)
                );
                focusData("branch", branch, { clipboardFn });
                appData.addNodeWithHistory(addHistory, branch);
                return true;
            }
        },
        {
            label: "새 진입점",
            click: ({ pos: { x, y } }) => {
                const entry = new EntryClass({ nodePos: getOriginalPos(x, y) });
                const clipboardFn = genClipboardFn("entry", entry, () =>
                    removeNodeWithHistory(entry)
                );
                focusData("entry", entry, { clipboardFn });
                appData.addNodeWithHistory(addHistory, entry);
                return true;
            }
        },
        { type: "seperator" },
        {
            label: "붙여넣기",
            click: ({ pos: { x, y } }) => {
                navigator.clipboard.readText().then((string) => {
                    pasted(string, { type: "project" }, getOriginalPos(x, y));
                });
                return true;
            }
        }
    ];
</script>

<svelte:body onkeydown={keydown} onkeyup={keyup} onmousemove={mousemove} onmouseup={mouseup} />
<div
    class="node-space"
    class:grabbing={realGrabbing}
    class:ready-to-grab={readyToGrab}
    onmousedown={mousedown}
    onwheel={wheel}
    use:rightclick={contextmenu}
>
    <Background />
    <div class="viewport" bind:this={viewportEl}>
        {#each appData.nodes as node (node.id)}
            {#if node.type === "sequence"}
                <Sequence
                    sequence={node}
                    isLastHold={node.id === lastHold}
                    onmousedown={() => (lastHold = node.id)}
                />
            {:else if node.type === "branch"}
                <Branch
                    branch={node}
                    isLastHold={node.id === lastHold}
                    onmousedown={() => (lastHold = node.id)}
                />
            {:else if node.type === "entry"}
                <Entry
                    entry={node}
                    isLastHold={node.id === lastHold}
                    onmousedown={() => (lastHold = node.id)}
                />
            {/if}
        {/each}
    </div>
    <Lines />
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
        left: 50%;
        top: 50%;
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
