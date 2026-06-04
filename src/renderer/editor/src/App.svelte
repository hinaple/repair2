<svelte:options runes={true} />

<script>
    import ToastDisplay from "./lib/ToastDisplay.svelte";
    import ContextMenu from "./lib/contextMenu/ContextMenu.svelte";
    import { appData } from "./lib/syncData.svelte";
    import { redo, undo } from "./lib/workHistory";
    import NodeSpace from "./nodes/NodeSpace.svelte";
    import { focusData } from "./sidebar/editUtils";
    import SideBar from "./sidebar/SideBar.svelte";
    import { onMount } from "svelte";
    import { ipcRenderer } from "electron";
    import { reload } from "./lib/stores";
    import Modal from "./lib/modal/ModalDisplay.svelte";

    focusData("project");

    function onkeydown(evt) {
        if (
            evt.target.tagName !== "INPUT" &&
            evt.target.tagName !== "TEXTAREA" &&
            evt.ctrlKey &&
            (evt.key == "z" || evt.key == "y")
        ) {
            evt.preventDefault();
            if (evt.key === "z" && evt.shiftKey) redo();
            else if (evt.key === "z") undo();
        }
    }

    $inspect(appData);

    onMount(() => {
        ipcRenderer.send("monitor-event", "start");
    });

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
        bottom: 5px;
        color: #000;
        font-size: 12px;
        opacity: 0.8;
        pointer-events: none;
        z-index: var(--info-z);
    }
    .screen {
        display: flex;
        flex-direction: row;
        width: 100%;
        height: 100%;
        position: absolute;
        left: 0;
        top: 0;
    }
</style>
