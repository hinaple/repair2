<script lang="ts">
  import { genId } from "@shared/genId";
  import outClickAction from "../actions/outclickaction";
  import outScrollAction from "../actions/outscrollaction";
  import { onMount } from "svelte";
  import Item from "./Item.svelte";
  import type {
    MenuButtonItem,
    MenuInitialActiveMode,
    MenuItem,
    MenuPointerActiveMode
  } from "./menu.types";

  let {
    items,
    parents,
    anchorName,
    width,
    initialActive = "auto",
    pointerActive = "persistent",
    collapse
  }: {
    items: readonly MenuItem[];
    parents: HTMLElement[];
    anchorName: string;
    width?: string;
    initialActive?: MenuInitialActiveMode;
    pointerActive?: MenuPointerActiveMode;
    collapse: () => unknown;
  } = $props();

  const menuId = genId();

  function isButtonItem(item: MenuItem): item is MenuButtonItem {
    return item.type !== "separator";
  }

  function samePath(a: readonly number[], b: readonly number[]) {
    return a.length === b.length && a.every((part, index) => part === b[index]);
  }

  function isPathPrefix(prefix: readonly number[], path: readonly number[]) {
    return prefix.length <= path.length && prefix.every((part, index) => part === path[index]);
  }

  function itemsAt(parentPath: readonly number[]): readonly MenuItem[] {
    let current = items;
    for (const index of parentPath) {
      const item = current[index];
      if (item?.type !== "submenu") return [];
      current = item.items;
    }
    return current;
  }

  function itemAt(path: readonly number[]): MenuItem | undefined {
    if (path.length === 0) return undefined;
    const parentItems = itemsAt(path.slice(0, -1));
    return parentItems[path.at(-1)!];
  }

  function selectableIndices(levelItems: readonly MenuItem[]) {
    const result: number[] = [];
    for (const [index, item] of levelItems.entries()) {
      if (isButtonItem(item) && !item.disabled) result.push(index);
    }
    return result;
  }

  function firstSelectablePath(parentPath: readonly number[]): number[] | null {
    const first = selectableIndices(itemsAt(parentPath))[0];
    return first === undefined ? null : [...parentPath, first];
  }

  function findCheckedPath(
    levelItems: readonly MenuItem[],
    parentPath: readonly number[] = []
  ): number[] | null {
    for (const [index, item] of levelItems.entries()) {
      const path = [...parentPath, index];
      if (item.type === "radio" && item.checked) return path;
      if (item.type === "submenu") {
        const childPath = findCheckedPath(item.items, path);
        if (childPath) return childPath;
      }
    }
    return null;
  }

  let activePath = $state<number[]>([]);
  let openedPath = $state<number[]>([]);
  let menuWidth = $derived(width ?? `anchor-size(${anchorName} width)`);

  function itemAnchor(path: readonly number[]) {
    return `--menu-${menuId}-${path.join("-")}`;
  }

  function isSubmenuOpen(path: readonly number[]) {
    return path.length > 0 && isPathPrefix(path, openedPath);
  }

  function hoverItem(path: number[], item: MenuButtonItem) {
    if (item.disabled) return;
    activePath = path;
    openedPath = item.type === "submenu" ? path : path.slice(0, -1);
  }

  function leaveItem(path: number[]) {
    if (pointerActive === "hover" && samePath(activePath, path)) activePath = [];
  }

  function leaveMenuTree(event: PointerEvent) {
    if (pointerActive !== "hover") return;

    const currentTarget = event.currentTarget;
    const nextTarget = event.relatedTarget;
    if (
      currentTarget instanceof Node &&
      nextTarget instanceof Node &&
      currentTarget.contains(nextTarget)
    )
      return;

    activePath = [];
    openedPath = [];
  }

  function openSubmenu(path: number[], focusChild: boolean) {
    const item = itemAt(path);
    if (item?.type !== "submenu" || item.disabled) return;
    openedPath = path;
    if (focusChild) activePath = firstSelectablePath(path) ?? path;
  }

  function activateItem(path: number[]) {
    const item = itemAt(path);
    if (!item || !isButtonItem(item) || item.disabled) return;

    activePath = path;
    if (item.type === "submenu") {
      openSubmenu(path, true);
      return;
    }

    if (item.type === "checkbox") item.activate?.(!item.checked);
    else item.activate?.();

    const shouldClose = item.closeOnActivate ?? item.type !== "checkbox";
    if (shouldClose) collapse();
  }

  function moveActive(offset: -1 | 1) {
    const parentPath = activePath.slice(0, -1);
    const indices = selectableIndices(itemsAt(parentPath));
    if (indices.length === 0) return;

    const currentIndex = indices.indexOf(activePath.at(-1)!);
    const nextIndex =
      currentIndex < 0
        ? offset > 0
          ? 0
          : indices.length - 1
        : Math.max(0, Math.min(indices.length - 1, currentIndex + offset));
    activePath = [...parentPath, indices[nextIndex]];
  }

  function closeSubmenu() {
    const parentPath = activePath.slice(0, -1);
    if (parentPath.length === 0) return;
    activePath = parentPath;
    openedPath = parentPath.slice(0, -1);
  }

  function onkeydown(event: KeyboardEvent) {
    let handled = true;

    if (event.key === "ArrowUp") moveActive(-1);
    else if (event.key === "ArrowDown") moveActive(1);
    else if (event.key === "ArrowRight") openSubmenu(activePath, true);
    else if (event.key === "ArrowLeft") closeSubmenu();
    else if (event.key === "Enter" || event.key === " ") activateItem(activePath);
    else if (event.key === "Escape") collapse();
    else if (event.key === "Tab") {
      collapse();
      handled = false;
    } else handled = false;

    if (!handled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  onMount(() => {
    const initialPath =
      initialActive === "auto" ? (findCheckedPath(items) ?? firstSelectablePath([]) ?? []) : [];
    activePath = initialPath;
    openedPath = initialPath.slice(0, -1);

    window.addEventListener("keydown", onkeydown, { capture: true });
    return () => window.removeEventListener("keydown", onkeydown, { capture: true });
  });
</script>

{#snippet renderLevel(
  levelItems: readonly MenuItem[],
  parentPath: number[],
  levelAnchor: string,
  root: boolean
)}
  <div
    class={["menu", root ? "root" : "submenu"]}
    role="menu"
    style={`--a: ${levelAnchor}; width: ${menuWidth};`}
  >
    {#each levelItems as item, index}
      {@const path = [...parentPath, index]}
      {#if item.type === "separator"}
        <div class="separator" role="separator"></div>
      {:else}
        {@const opened = item.type === "submenu" && isSubmenuOpen(path)}
        {@const childAnchor = itemAnchor(path)}
        <div class="item-container">
          <Item
            {item}
            anchorName={childAnchor}
            active={samePath(activePath, path)}
            expanded={opened}
            onhover={() => hoverItem(path, item)}
            onleave={() => leaveItem(path)}
            onactivate={() => activateItem(path)}
          />
          {#if item.type === "submenu" && opened}
            {@render renderLevel(item.items, path, childAnchor, false)}
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/snippet}

<div
  class="menu-root"
  role="presentation"
  onpointerout={leaveMenuTree}
  use:outClickAction={{ callback: collapse, excludes: parents }}
  use:outScrollAction={collapse}
>
  {@render renderLevel(items, [], anchorName, true)}
</div>

<style>
  .menu-root {
    display: contents;
  }

  .menu {
    background-color: var(--option-bg);
    padding: 5px;
    display: flex;
    flex-direction: column;
    max-height: 300px;
    overflow-y: auto;
    position: fixed;
    position-anchor: var(--a);
    box-sizing: border-box;
    z-index: var(--contextmenu-z);
    border-radius: 20px;
    corner-shape: squircle;
  }

  .menu.root {
    position-area: end span-end;
    position-try-fallbacks:
      flip-block,
      flip-inline,
      flip-block flip-inline,
      --top-scrollable;
    margin-block-start: 3px;
  }

  .menu.submenu {
    position-area: inline-end span-block-end;
    position-try-fallbacks: flip-inline;
    margin-inline-start: 5px;
  }

  .item-container {
    display: contents;
  }

  .separator {
    height: 1px;
    margin: 4px;
    background-color: var(--w-o2);
    flex: 0 0 auto;
  }

  @position-try --top-scrollable {
    position-area: block-start span-inline-end;
    align-self: stretch;
  }
</style>
