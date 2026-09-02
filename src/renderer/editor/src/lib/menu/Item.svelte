<script lang="ts">
  import type { MenuButtonItem } from "./menu.types";

  let {
    item,
    active = false,
    expanded = false,
    anchorName,
    onhover,
    onleave,
    onactivate
  }: {
    item: MenuButtonItem;
    active?: boolean;
    expanded?: boolean;
    anchorName: string;
    onhover: () => unknown;
    onleave: () => unknown;
    onactivate: () => unknown;
  } = $props();

  let el: HTMLButtonElement | undefined;

  let selectable = $derived(item.type === "checkbox" || item.type === "radio");
  let selected = $derived(item.type === "checkbox" || item.type === "radio" ? item.checked : false);
  let role = $derived(
    item.type === "checkbox"
      ? "menuitemcheckbox"
      : item.type === "radio"
        ? "menuitemradio"
        : "menuitem"
  );

  $effect(() => {
    if (active && el) el.scrollIntoView({ block: "nearest" });
  });
</script>

<button
  bind:this={el}
  type="button"
  tabindex={-1}
  class={["item", selected && "selected", (active || expanded) && "active"]}
  style={`--a: ${anchorName};`}
  {role}
  disabled={item.disabled}
  onclick={onactivate}
  onpointerdown={(event) => event.preventDefault()}
  onpointerenter={onhover}
  onpointerleave={onleave}
>
  <span class="indicator">
    {#if selectable}
      <svg xmlns="http://www.w3.org/2000/svg" width="6" height="5" fill="none" viewBox="0 0 6 5">
        <path stroke="currentColor" d="m1 2 1.5 1.5L5 1" />
      </svg>
    {/if}
  </span>
  <span class="label">{item.label}</span>
  {#if item.type === "submenu"}
    <svg class="submenu-icon" width="5" height="7" viewBox="0 0 5 7" fill="none">
      <path d="M0.353546 0.353577L3.35355 3.35358L0.353546 6.35358" stroke="currentColor" />
    </svg>
  {/if}
</button>

<style>
  .item {
    width: 100%;
    border: solid transparent 1px;
    border-radius: 5px;
    padding: 2px 4px;
    color: #fff;
    font-family: "Pretend";
    font-size: 16px;
    font-weight: 400;
    letter-spacing: 0.04em;
    text-align: left;
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    gap: 6px;
    align-items: center;
    anchor-name: var(--a);
  }

  .item.active {
    background-color: var(--blue-dark);
  }

  .item:disabled {
    opacity: 0.35;
  }

  .indicator {
    width: 12px;
    height: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .indicator svg {
    width: 12px;
    height: auto;
    opacity: 0;
    stroke-width: 0.6px;
  }

  .item.selected .indicator svg {
    opacity: 1;
  }

  .label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .submenu-icon {
    width: 7px;
    height: auto;
    flex: 0 0 auto;
  }
</style>
