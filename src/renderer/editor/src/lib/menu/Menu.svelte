<script lang="ts" generics="T extends null | string | number | boolean">
  import type { KeyboardEventHandler } from "svelte/elements";
  import outClickAction from "../actions/outclickaction";
  import outScrollAction from "../actions/outscrollaction";
  import { onMount } from "svelte";

  let {
    select,
    value,
    labelMap,
    parents,
    anchorName,
    collapse,
    placeholder,
    unselectable = false
  }: {
    select: (v: T | null) => unknown;
    value: T | null;
    labelMap: Map<T, string>;
    parents: HTMLElement[];
    anchorName: string;
    collapse: () => unknown;
    placeholder: string;
    unselectable?: boolean;
  } & {} = $props();

  let entries = $derived([...labelMap.entries()]);
  let hoveringIdx = $derived(entries.findIndex(([v]) => v === value));
  let optionEls = $derived<HTMLElement[]>(new Array(entries.length));

  const onkeydown: KeyboardEventHandler<HTMLElement> = (evt) => {
    if (evt.key === "Enter" && hoveringIdx >= 0) {
      select(entries[hoveringIdx][0]);
      evt.preventDefault();
    }
    if (evt.key === "Enter" || evt.key === "Escape" || evt.key === "Tab") return collapse();

    if (evt.key === "ArrowUp")
      offsetHovering(-1); //= Math.max(0, hoveringIdx - 1);
    else if (evt.key === "ArrowDown") offsetHovering(1); //hoveringIdx = Math.min(entries.length - 1, hoveringIdx + 1);
  };

  function offsetHovering(offset: number) {
    hoveringIdx = Math.max(0, Math.min(entries.length - 1, hoveringIdx + offset));
    scrollToNth(hoveringIdx);
  }

  function onhover(idx: number) {
    hoveringIdx = idx;
  }

  function scrollToNth(n: number, center = false) {
    optionEls[n].scrollIntoView({ block: center ? "center" : "nearest" });
  }

  onMount(() => {
    if (hoveringIdx >= 0) scrollToNth(hoveringIdx, true);
  });
</script>

<svelte:body {onkeydown} />
<div
  class="options"
  style={`--a: ${anchorName};`}
  use:outClickAction={{ callback: collapse, excludes: parents }}
  use:outScrollAction={collapse}
>
  {#if unselectable}
    <button
      tabindex={-1}
      class={["option", null === value && "selected"]}
      onclick={() => select(null)}
    >
      {placeholder}
    </button>
  {/if}
  {#each entries as [ov, label], idx}
    <button
      bind:this={optionEls[idx]}
      tabindex={-1}
      class={["option", ov === value && "selected", hoveringIdx === idx && "hover"]}
      onclick={() => select(ov)}
      onpointerdown={(evt) => evt.preventDefault()}
      onpointerenter={() => onhover(idx)}
    >
      <svg
        class="inner"
        xmlns="http://www.w3.org/2000/svg"
        width="6"
        height="5"
        fill="none"
        viewBox="0 0 6 5"
      >
        <path stroke="#fff" d="m1 2 1.5 1.5L5 1" />
      </svg>
      <span>
        {label}
      </span>
    </button>
  {/each}
</div>

<style>
  .options {
    background-color: var(--option-bg);
    padding: 5px;
    display: flex;
    flex-direction: column;
    max-height: 300px;
    overflow-y: auto;
    border-radius: 10px;
    position: fixed;
    position-anchor: var(--a);
    position-area: end span-end;
    position-try-fallbacks: flip-block, --top-scrollable;
    min-width: anchor-size(width);
    box-sizing: border-box;
    z-index: var(--contextmenu-z);
    margin-block-start: 3px;

    button {
      border: none;
      border-radius: 5px;
      text-align: left;
      padding: 2px 4px;
      border: solid transparent 1px;
      font-family: "Pretend";
      font-size: 16px;
      color: #fff;
      font-weight: 400;
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      gap: 6px;
      letter-spacing: 0.04em;
      align-items: center;
    }
    svg {
      width: 12px;
      height: auto;
      flex: 0 0 auto;
      opacity: 0;
      stroke-width: 0.6px;
    }

    button.hover {
      background-color: var(--blue-dark);
    }
    button.selected {
      svg {
        opacity: 1;
      }
    }
  }

  @position-try --bottom-scrollable {
    align-self: stretch;
  }

  @position-try --top-scrollable {
    position-area: block-start span-inline-end;
    align-self: stretch;
  }
</style>
