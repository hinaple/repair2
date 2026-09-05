<script lang="ts">
  import TitleBarLogo from "../assets/icons/TitleBarLogo.svelte";
  import { closeContextMenu } from "../lib/editUtils/contextMenu/contextUtils";
  import Menu from "../lib/menu/Menu.svelte";
  import { getMutator, getProject, unsaved } from "../project/store";
  import { titleBar, TITLEBAR_HEIGHT_OFFSET, TitleBarMenu } from "./index.svelte";

  let btnEls = $state(new Array<HTMLButtonElement>(TitleBarMenu.length));
  let focussing = $state(-1);
  let showItems = $state(0);

  function onWindowBlur() {
    unfocus();
    pressingAlt = 0;
  }

  let currentOnblur = -1;
  function registerOnBlur(idx: number) {
    if (currentOnblur === idx) return;
    unregisterOnBlur();
    btnEls[idx].addEventListener("blur", unfocus);
    currentOnblur = idx;
  }
  function unregisterOnBlur() {
    if (currentOnblur === -1) return;

    btnEls[currentOnblur].removeEventListener("blur", unfocus);
    currentOnblur = -1;
  }

  function unfocus() {
    unregisterOnBlur();
    if (focussing === -1) return;
    focussing = -1;
    showItems = 0;
  }

  function setFocussing(i: number, newShowItems = showItems) {
    if (focussing !== -1) unregisterOnBlur();
    focussing = (i + TitleBarMenu.length) % TitleBarMenu.length;

    if (newShowItems !== showItems) showItems = newShowItems;

    if (!showItems) {
      btnEls[focussing].focus();
      registerOnBlur(focussing);
    }
  }

  function processAltKey(evt: KeyboardEvent) {
    if ((pressingAlt || focussing !== -1) && !showItems && !evt.ctrlKey && !evt.shiftKey) {
      let key = evt.key;
      if (typeof key !== "string" || key.length !== 1 || !key.match(/[a-zA-Z]/)) return;
      key = key.toUpperCase();

      const targetIdx = TitleBarMenu.findIndex((m) => m.key === key);
      if (targetIdx === -1) return;

      clickMenuBtn(targetIdx, true);
    }
  }

  let pressingAlt = $state(0);
  function onkeydown(evt: KeyboardEvent) {
    processAltKey(evt);

    if (focussing !== -1) {
      if (evt.key === "ArrowLeft") setFocussing(focussing - 1, showItems ? 2 : 0);
      else if (evt.key === "ArrowRight") setFocussing(focussing + 1, showItems ? 2 : 0);
      else if (evt.key === "Alt" || (evt.key === "Escape" && !showItems)) unfocus();
      else if (evt.key === "Escape") showItems = 0;
      else if (!showItems && (evt.key === "Enter" || evt.key === "ArrowDown")) showItems = 2;

      return;
    }

    if (evt.key !== "Alt") {
      if (pressingAlt === 1) pressingAlt = 2;
      return;
    }
    pressingAlt = 1;
  }

  function onkeyup(evt: KeyboardEvent) {
    if (!pressingAlt || evt.key !== "Alt") return;
    if (pressingAlt === 1 && !showItems) setFocussing(0);
    pressingAlt = 0;
    closeContextMenu();
  }

  function nthMenuBtnAnchor(idx: number) {
    return `--title-menu-btn-${idx}`;
  }

  function clickMenuBtn(idx: number, autofocus = false) {
    unregisterOnBlur();
    setFocussing(idx, autofocus ? 2 : 1);
  }
</script>

<svelte:window {onkeydown} {onkeyup} onblur={onWindowBlur} />
<div
  class={["title-bar", (focussing !== -1 || pressingAlt) && "ready-to-alt"]}
  style={`--height-offset: ${TITLEBAR_HEIGHT_OFFSET}px;` +
    `--control-btn-w: ${titleBar.controlBtnWidth}px;`}
>
  <div class="side left">
    <div class="spacer"></div>
    <TitleBarLogo />
    <div class="menus">
      {#each TitleBarMenu as { label, key }, i}
        <button
          style={`--a: ${nthMenuBtnAnchor(i)};`}
          bind:this={btnEls[i]}
          class={["menu-btn", focussing === i && (showItems ? "hover" : "focussed")]}
          onclick={() => clickMenuBtn(i)}
          onpointerenter={() => {
            if (!showItems) return;
            showItems = 1;
            focussing = i;
          }}
        >
          {label}(<span class="key">{key}</span>)
        </button>
      {/each}
    </div>
  </div>
  <div class={["title-container", $unsaved && "unsaved"]}>
    <span class="title">
      {getMutator().config().field("title").value || "(제목 없음)"}
    </span>{$unsaved ? "*" : ""}
  </div>
  <div class="side right">
    <div class="info">v{__APP_VERSION__}</div>
    <div class="spacer"></div>
  </div>
</div>
{#if showItems && focussing !== -1}
  {#key focussing}
    <Menu
      items={TitleBarMenu[focussing].items}
      parents={btnEls}
      anchorName={nthMenuBtnAnchor(focussing)}
      initialActive={showItems === 1 ? "none" : "auto"}
      pointerActive="hover"
      style="menu"
      collapse={(blurred) => {
        if (blurred) unfocus();
        else setFocussing(focussing, 0);
      }}
    />
  {/key}
{/if}

<style>
  .title-bar {
    background-color: var(--darkgray);
    flex: 0 0 auto;
    app-region: drag;
    width: 100%;
    border-bottom: solid var(--w-o6) 1px;
    height: calc(
      calc(env(titlebar-area-y, 0px) + env(titlebar-area-height, 36px)) + var(--height-offset)
    );
    display: flex;
    flex-direction: row;
    padding-left: env(titlebar-area-x, 0px);
    box-sizing: border-box;
    align-items: center;
    overflow: hidden;
  }
  .title-container {
    color: #fffd;
    white-space: pre;
    font-weight: 500;
    flex: 0 0 auto;
    overflow: hidden;
  }
  .title-container.unsaved {
    font-style: oblique;
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .side {
    flex: 1 2 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    height: 100%;
    align-items: center;
    min-width: fit-content;
  }
  .spacer {
    flex: 0 0 auto;
  }
  .side.left {
    gap: 8px;

    .spacer {
      width: 8px;
    }
  }
  .side.right {
    justify-content: end;
    gap: 5px;
    .spacer {
      width: var(--control-btn-w);
    }
  }
  .info {
    color: #fff;
    opacity: 0.3;
    font-size: 12px;
  }
  .menus {
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2px;
  }
  .menu-btn {
    color: var(--w-o6);
    padding-inline: 10px;
    height: calc(100% - 10px);
    border-radius: 10px;
    corner-shape: squircle;
    app-region: no-drag;
    font-size: 14px;
    anchor-name: var(--a);
    flex: 0 0 auto;
  }
  .menu-btn.focussed,
  .menu-btn.hover,
  .menu-btn:hover {
    background-color: var(--w-o1);
    color: #fff;
  }
  .menu-btn.focussed {
    outline: solid var(--blue-bright) 1px;
  }
  .ready-to-alt .key {
    text-decoration: underline;
  }
</style>
