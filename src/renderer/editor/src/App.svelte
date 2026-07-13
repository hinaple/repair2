<svelte:options runes={true} />

<script lang="ts">
  import ToastDisplay from "./lib/toast/ToastDisplay.svelte";
  import ContextMenu from "./lib/editUtils/contextMenu/ContextMenu.svelte";
  import { redo, undo } from "./lib/editUtils/history";
  import NodeSpace from "./nodes/NodeSpace.svelte";
  import { focusData } from "./lib/editUtils/focus";
  import SideBar from "./sidebar/SideBar.svelte";
  import { onMount } from "svelte";
  import { reload } from "./lib/stores";
  import Modal from "./lib/modal/ModalDisplay.svelte";
  import { ipc } from "./lib/ipc";
  import { play } from "./lib/msg";

  function onkeydown(evt: KeyboardEvent) {
    // if (
    //   evt.ctrlKey &&
    //   evt.target &&
    //   evt.target instanceof HTMLElement &&
    //   evt.target.tagName !== "INPUT" &&
    //   evt.target.tagName !== "TEXTAREA" &&
    //   (evt.key == "z" || evt.key == "y")
    // ) {
    //   evt.preventDefault();
    //   if (evt.key === "z" && evt.shiftKey) redo();
    //   else if (evt.key === "z") undo();
    // }
  }

  document.fonts.ready.then(() => {
    reload("nodeMoved");
    console.log("fonts loaded");
  });
</script>

<svelte:window {onkeydown} />
<div class="info">REPAIR v{__APP_VERSION__}</div>
<ContextMenu />
<ToastDisplay />
<Modal />
<div class="screen">
  <SideBar />
  <NodeSpace />
</div>

<style>
  .info {
    position: fixed;
    right: 5px;
    top: 5px;
    color: #000;
    font-size: 12px;
    opacity: 0.8;
    pointer-events: none;
    z-index: var(--info-z);
  }
  .screen {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
  }
</style>
