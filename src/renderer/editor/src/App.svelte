<svelte:options runes={true} />

<script lang="ts">
  import ToastDisplay from "./lib/toast/ToastDisplay.svelte";
  import ContextMenu from "./lib/editUtils/contextMenu/ContextMenu.svelte";
  import NodeSpace from "./nodes/NodeSpace.svelte";
  import SideBar from "./sidebar/SideBar.svelte";
  import { onMount } from "svelte";
  import { reloadAllNode } from "./lib/stores";
  import Modal from "./lib/modal/ModalDisplay.svelte";
  import { observingViewport, setViewportSize, viewport } from "./nodes/viewport";
  import { getProject } from "./project/store";
  import TitleBar from "./titleBar/TitleBar.svelte";

  onMount(() => {
    const project = getProject();

    viewport.pos.set(project.viewport.pos);
    setViewportSize(project.viewport.size);
  });

  document.fonts.ready.then(() => {
    reloadAllNode();
    console.log("fonts loaded");
  });
</script>

<div class="root">
  <TitleBar />
  <ContextMenu />
  <ToastDisplay />
  <div class="window" use:observingViewport>
    <Modal />
    <div class="screen">
      <SideBar />
      <NodeSpace />
    </div>
  </div>
</div>

<style>
  .root {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .window {
    position: relative;
    width: 100%;
    flex: 1 1 auto;
  }
  .screen {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
  }
</style>
