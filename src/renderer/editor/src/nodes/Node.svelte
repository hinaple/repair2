<script lang="ts">
  import { onDestroy, onMount, type Snippet } from "svelte";
  import Grabber from "../lib/grabber";
  import FrameUpdater from "../lib/frameUpdater";
  import FoldArrow from "../lib/FoldArrow.svelte";
  import { data } from "../lib/editUtils/dataAction";
  import { currentFocus } from "../lib/editUtils/focus";
  import { grabbing, GrabKeys, reload, sequenceMovedReloader } from "../lib/stores";
  import type { EditSession, FieldBinding } from "../project/mutator";
  import { getMutator } from "../project/store";
  import inputNode from "./lines/input";
  import outputNode from "./lines/output";
  import { deleteNodeGeometry, setNodeSize } from "./geometry";

  type OutputView = {
    id: string;
    binding: FieldBinding<string | null>;
    label?: string;
  };

  let {
    id,
    outputs,
    innerOutputs = [],
    title,
    isLastHold = false,
    onpointerdown: bubblePointerDown = () => {},
    body = null,
    minWidth = 200,
    hasInput = true,
    color = "#000"
  }: {
    id: string;
    outputs: OutputView[];
    innerOutputs?: OutputView[];
    title: string;
    isLastHold?: boolean;
    onpointerdown?: (event: PointerEvent) => unknown;
    body?: Snippet | null;
    minWidth?: number;
    hasInput?: boolean;
    color?: string;
  } = $props();

  const editor = $derived(getMutator().record("nodes", id));
  const node = $derived(editor.value);
  let nodeEl = $state<HTMLElement | null>(null);
  let handleEl = $state<HTMLElement | null>(null);
  let grabber: Grabber | null = null;
  let isFocused = $state(false);
  let folded = $derived("folded" in node ? node.folded : false);

  $effect(() => {
    title;
    reload("nodeMoved");
  });

  const frameUpdater = new FrameUpdater(() => {
    if (!nodeEl) return;
    const pos = editor.value.nodePos;
    nodeEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  }, 0);
  const applyNodePos = () => frameUpdater.draw();

  const unsubs = [
    sequenceMovedReloader.subscribe(applyNodePos),
    currentFocus.subscribe((focus) => {
      isFocused =
        (focus.type === "node" && focus.target === id) ||
        (focus.type === "nodes" && focus.target.has(id));
    }),
    getMutator().subscribe({ kind: "record", type: "nodes", id }, (change) => {
      if (change.path[0] !== "nodePos") return;
      applyNodePos();
      if (change.direction !== "transient") reload("nodeMoved");
    })
  ];

  type MovingNode = {
    id: string;
    session: EditSession<{ x: number; y: number }>;
  };
  let moving: MovingNode[] = [];

  onMount(() => {
    applyNodePos();
    grabber = new Grabber({
      container: nodeEl!,
      handle: handleEl!,
      onMoveStart: () => {
        const focus = $currentFocus;
        const ids = focus.type === "nodes" && focus.target.has(id) ? [...focus.target] : [id];
        moving = ids.map((movingId) => ({
          id: movingId,
          session: getMutator().record("nodes", movingId).field("nodePos").begin()
        }));
      },
      onMoved: ({ dx, dy }) => {
        for (const item of moving) {
          const movingEditor = getMutator().record("nodes", item.id);
          const pos = movingEditor.value.nodePos;
          item.session.update({ x: pos.x + dx, y: pos.y + dy });
        }
        reload("sequenceMoved");
      },
      onMoveEnd: (moved) => {
        for (const item of moving) moved ? item.session.commit() : item.session.cancel();
        moving = [];
        reload("sequenceMoved");
      }
    });
    reload("sequenceMoved");
  });

  onDestroy(() => {
    unsubs.forEach((unsubscribe) => unsubscribe());
    frameUpdater.destroy();
    grabber?.destroy?.();
    deleteNodeGeometry(id);
  });

  function pointerDownCapture(event: PointerEvent) {
    if (event.button || $grabbing === GrabKeys.viewport || $grabbing === GrabKeys.viewportReady)
      return;
    bubblePointerDown(event);
  }

  function toggleFold() {
    if (node.nodeType === "sequence" || node.nodeType === "variableSet")
      editor.at<boolean>("folded").setTransient(!folded);
    reload("nodeMoved");
  }

  function boxSizeUpdated([box]: ResizeObserverSize[]) {
    setNodeSize(id, box.inlineSize, box.blockSize);
  }
</script>

<div
  class={[
    "wrapper",
    isLastHold && "last-hold",
    node.nodeType,
    folded && !innerOutputs.length && "folded"
  ]}
  bind:this={nodeEl}
  onpointerdowncapture={pointerDownCapture}
  use:data={{ type: node.nodeType, id }}
  bind:borderBoxSize={null, boxSizeUpdated}
>
  <div class="node-wrapper" style={`--node-color: ${color};`}>
    <div class={["node", isFocused && "focus"]} {id} style={`min-width: ${minWidth}px;`}>
      <div class="head" use:inputNode={{ hasInput, id }}>
        <div class="handle" bind:this={handleEl}><span>{title}</span></div>
        {#if node.nodeType !== "entry" && node.nodeType !== "branch"}
          <FoldArrow {folded} toggle={toggleFold} />
        {/if}
      </div>
      {#if !folded && node.nodeType !== "entry" && body}
        {@render body()}
      {:else if innerOutputs.length}
        <div class="inner-outputs">
          {#each innerOutputs as output}
            <div class="right-output-wrapper">
              <div class="right-output" use:outputNode={output}></div>
            </div>
          {/each}
        </div>
      {/if}
      {#if hasInput}<div class="start-circle" use:inputNode={{ id, hasInput }}></div>{/if}
    </div>
    <div class="outputs">
      {#each outputs as output}
        <div class="output" use:outputNode={output}>
          {#if !folded && output.label}<div class="output-label">{output.label}</div>{/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .wrapper {
    position: absolute;
    border-radius: 20px;
    corner-shape: squircle;
  }
  .wrapper.folded {
    border-radius: 10px;
    corner-shape: round;
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
    border-radius: 20px;
    corner-shape: squircle;
    background-color: var(--w-o8);
  }
  .folded .node {
    border-radius: 10px;
    corner-shape: round;
  }
  .head {
    color: #fff;
    flex: 0 0 auto;
    background-color: var(--node-color);
    cursor: grab;
    font-weight: 600;
    display: flex;
    height: 30px;
    box-sizing: border-box;
    border-radius: 20px 20px 0 0;
    corner-shape: squircle;
  }
  .entry .head {
    border-radius: 20px;
    height: 45px;
  }
  .folded .head {
    border-radius: 10px;
    corner-shape: round;
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
    top: calc((45px - 16px) / 2);
  }
  .outputs {
    right: -14px;
    position: absolute;
    height: 30px;
    display: flex;
    flex-direction: column;
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
    position: absolute;
    right: -14px;
    border-radius: 0 7px 7px 0;
  }
</style>
