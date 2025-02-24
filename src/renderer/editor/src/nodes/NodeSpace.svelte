<script>
    import { onDestroy, onMount } from "svelte";
    import Background from "./Background.svelte";
    import {
        viewport,
        rInfo,
        resizeViewport,
        moveViewport,
        posFromViewport,
        setViewportSize,
        getOriginalPos
    } from "./viewport";
    import Sequence from "./Sequence.svelte";
    import { grabbing } from "../lib/stores";
    import { get } from "svelte/store";
    import Lines from "./lines/Lines.svelte";
    import { appData } from "../lib/syncData.svelte";
    import { focusData } from "../sidebar/editUtils";
    import { rightclick } from "../lib/contextMenu/contextUtils";
    import SequenceClass from "@classes/sequence.svelte";
    import BranchClass from "@classes/branch.svelte";
    import { addHistory } from "../lib/workHistory";
    import Branch from "./branch/Branch.svelte";

    let readyToGrab = $state(false);
    function keydown(evt) {
        if (evt.key === " " && !get(grabbing)) {
            readyToGrab = true;
            grabbing.set(myGrab);
        }
        if (!evt.ctrlKey) return;
        if (evt.key === "0") {
            setViewportSize(0);
            viewport.pos.set({ x: 0, y: 0 });
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
    function mousedown(evt) {
        if (!((evt.button === 0 && readyToGrab) || (evt.button === 1 && !get(grabbing)))) {
            if (!evt.button && !get(grabbing)) focusData("project");
            return;
        }
        grabbing.set(myGrab);
        realGrabbing = true;
        prvMouse = { x: evt.screenX, y: evt.screenY };
    }
    function mousemove(evt) {
        if (!realGrabbing) return;

        moveViewport(-evt.screenX + prvMouse.x, -evt.screenY + prvMouse.y);
        prvMouse = { x: evt.screenX, y: evt.screenY };
    }
    function mouseup(evt) {
        if (!realGrabbing || evt.button === 2) return;
        if (!readyToGrab) grabbing.set(null);
        realGrabbing = false;
    }

    function wheel(evt) {
        if (get(grabbing)) return;
        const dir = Math.abs(evt.deltaY) / evt.deltaY;
        if (evt.ctrlKey || evt.shiftKey) {
            moveViewport(evt.ctrlKey ? dir * 15 : 0, evt.shiftKey ? dir * 15 : 0);
        } else if (evt.altKey) {
            resizeViewport(-dir);
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
                addHistory({
                    doFn: (d) => {
                        appData.nodes.push(d);
                    },
                    undoFn: () => {
                        appData.nodes.pop();
                    },
                    doData: seq
                });
                return true;
            }
        },
        {
            label: "새 분기점",
            click: ({ pos: { x, y } }) => {
                const branch = new BranchClass({ nodePos: getOriginalPos(x, y) });
                addHistory({
                    doFn: (d) => {
                        appData.nodes.push(d);
                    },
                    undoFn: () => {
                        appData.nodes.pop();
                    },
                    doData: branch
                });
                return true;
            }
        },
        { type: "seperator" },
        {
            label: "붙여넣기",
            click: () => {
                console.log(1);
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
            {/if}
        {/each}
    </div>
    <Lines />
</div>

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
</style>
