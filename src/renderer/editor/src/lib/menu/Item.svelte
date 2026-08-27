<script lang="ts">
  import event from "../actions/eventAction";
  import type { MenuItem } from "./menu.types";

  let {
    el = $bindable(),
    item,
    hovering = false,
    parents = [],
    onhover
  }: {
    item: Exclude<MenuItem, { type: "separator" }>;
    el: HTMLElement;
    hovering: boolean;
    parents?: HTMLElement[];
    onhover: () => unknown;
  } = $props();

  function onclick() {
    if (item.type === "submenu") {
      return;
    }

    item.click?.();
  }

  function onpointerenter() {
    onhover();
    if (item.type !== "submenu") return;
  }
</script>

<button
  bind:this={el}
  tabindex={-1}
  class={["option", item.type === "checkbox" && item.checked && "selected", hovering && "hover"]}
  {onclick}
  onpointerdown={(evt) => evt.preventDefault()}
  {onpointerenter}
>
  {#if item.type === "checkbox"}
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
  {/if}
  <span>{item.label}</span>
  {#if item.type === "submenu"}
    <svg width="5" height="7" viewBox="0 0 5 7" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.353546 0.353577L3.35355 3.35358L0.353546 6.35358" stroke="black" />
    </svg>
  {/if}
</button>
