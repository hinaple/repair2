<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Background from "./Background.svelte";
  import {
    viewport,
    rInfo,
    resizeViewport,
    moveViewport,
    posFromViewport,
    getOriginalPos,
    setViewportEl
  } from "./viewport";
  import Sequence from "./Sequence.svelte";
  import { grabbing, GrabKeys } from "../lib/stores";
  import Lines from "./lines/Lines.svelte";
  import { getProject } from "../project/store";
  import { focusData } from "../lib/editUtils/focus";
  import { rightclick } from "../lib/editUtils/contextMenu/contextUtils";
  import Branch from "./Branch.svelte";
  import Entry from "./Entry.svelte";
  import { pasted } from "../lib/editUtils/clipboard";
  import { fade } from "svelte/transition";
  import FrameUpdater from "../lib/frameUpdater";
  import VariableSet from "./VariableSet.svelte";
  import LinesOld from "./lines/LinesOld.svelte";
  import event from "../lib/actions/eventAction";

  const myReadyGrab = GrabKeys.viewport;
  const myGrab = GrabKeys.viewportReady;

  let readyToGrab = $state(false);
  function keydown(evt: KeyboardEvent) {
    if (
      !(evt.target instanceof HTMLElement) ||
      evt.target.tagName === "INPUT" ||
      evt.target.tagName === "TEXTAREA"
    )
      return;
    if (evt.key === " " && !$grabbing) {
      readyToGrab = true;
      $grabbing = myReadyGrab;
    }
  }
  function keyup(evt: KeyboardEvent) {
    if (evt.key === " ") {
      readyToGrab = false;
      if ($grabbing === myGrab || $grabbing === myReadyGrab) $grabbing = null;
    }
    if (evt.key === "Alt") evt.preventDefault();
  }

  let realGrabbing = $state(false);
  let prvMouse: { x: number; y: number } | null = null;
  let selectOrigin = $state<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  let selectBoxEl = $state<HTMLElement | null>(null);
  function pointerdown(evt: PointerEvent) {
    if (evt.button === 0 && !$grabbing) {
      const x = evt.clientX,
        y = evt.clientY;
      selectOrigin = { x1: x, y1: y, x2: x, y2: y };
    }

    if ((evt.button === 0 && readyToGrab) || (evt.button === 1 && (readyToGrab || !$grabbing))) {
      $grabbing = myGrab;
      realGrabbing = true;
      prvMouse = { x: evt.screenX, y: evt.screenY };
      evt.preventDefault();
    } else if (evt.button === 0 && (!$grabbing || readyToGrab)) focusData("project");
  }
  function pointermove(evt: PointerEvent) {
    if (selectOrigin && selectBoxEl) {
      if ($grabbing !== "select") $grabbing = "select";

      selectOrigin.x2 = evt.clientX;
      selectOrigin.y2 = evt.clientY;
      selectBoxEl.style.display = "block";
      selectBoxEl.style.transform = `translate(${Math.min(selectOrigin.x1, selectOrigin.x2)}px, ${Math.min(selectOrigin.y1, selectOrigin.y2)}px)`;
      selectBoxEl.style.width = `${Math.abs(selectOrigin.x1 - selectOrigin.x2)}px`;
      selectBoxEl.style.height = `${Math.abs(selectOrigin.y1 - selectOrigin.y2)}px`;
      return;
    }

    if (!realGrabbing) return;

    moveViewport(-evt.screenX + prvMouse!.x, -evt.screenY + prvMouse!.y);
    prvMouse = { x: evt.screenX, y: evt.screenY };
  }
  function pointerup(evt: PointerEvent) {
    if (selectOrigin) {
      if (selectOrigin.x2) {
        const area = {
          x1: Math.min(selectOrigin.x1, selectOrigin.x2),
          y1: Math.min(selectOrigin.y1, selectOrigin.y2),
          x2: Math.max(selectOrigin.x1, selectOrigin.x2),
          y2: Math.max(selectOrigin.y1, selectOrigin.y2)
        };
        // focusData(
        //   "nodes",
        //   new Set(
        //     getProject()
        //       .nodes.values()
        //       .filter((node) => {
        //         const rect = node.requestRect();
        //         return (
        //           rect &&
        //           area.x1 < rect.left &&
        //           area.x2 > rect.right &&
        //           area.y1 < rect.top &&
        //           area.y2 > rect.bottom
        //         );
        //       })
        //   )
        // );
      }
      selectOrigin = null;
      $grabbing = null;
      return;
    }
    if (!realGrabbing || evt.button === 2) return;
    $grabbing = readyToGrab ? myReadyGrab : null;
    realGrabbing = false;
  }

  function wheel(evt: WheelEvent) {
    if (!readyToGrab && $grabbing) return;
    const dir = Math.abs(evt.deltaY) / evt.deltaY;
    if (isNaN(dir)) return;
    if (evt.ctrlKey || evt.shiftKey)
      moveViewport(evt.ctrlKey ? dir * 15 : 0, evt.shiftKey ? dir * 15 : 0);
    else resizeViewport(-dir, { x: evt.clientX, y: evt.clientY });
  }

  let viewportEl = $state<HTMLElement | null>(null);

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

  let lastHold = $state<string | null>(null);

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
  use:event={["wheel", wheel, { passive: true }]}
  use:rightclick={{ type: "project" }}
  use:setViewportEl
>
  <Background />
  {#if renderWithWebGL}
    <Lines {unsupported} />
  {:else}
    <LinesOld />
  {/if}
  <div class="viewport" bind:this={viewportEl}>
    {#each getProject().nodes as [id, node] (id)}
      {#if node.nodeType === "sequence"}
        <Sequence
          sequence={node}
          isLastHold={id === lastHold}
          onpointerdown={() => (lastHold = id)}
        />
      {:else if node.nodeType === "branch"}
        <Branch branch={node} isLastHold={id === lastHold} onpointerdown={() => (lastHold = id)} />
      {:else if node.nodeType === "entry"}
        <Entry entry={node} isLastHold={id === lastHold} onpointerdown={() => (lastHold = id)} />
      {:else if node.nodeType === "variableSet"}
        <VariableSet
          variableSet={node}
          isLastHold={id === lastHold}
          onpointerdown={() => (lastHold = id)}
        />
      {/if}
    {/each}
  </div>
</div>
{#if selectOrigin}
  <div class="select-box" bind:this={selectBoxEl} out:fade={{ duration: 80 }}></div>
{/if}

<style>
  .node-space {
    height: 100%;
    right: 0;
    position: absolute;
    background-color: #eeeff0;
    overflow: hidden;
    contain: strict style;
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
  .node-space.grabbing > .viewport {
    will-change: transform;
  }
  .viewport {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
    transform-origin: left top;
  }

  .select-box {
    left: 0;
    top: 0;
    position: fixed;
    pointer-events: none;
    width: 0;
    height: 0;
    background-color: #2b6eff4a;
    outline: solid 2px var(--blue-dark);
    display: none;
    border-radius: 2px;
  }
</style>
