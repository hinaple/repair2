<svelte:options runes={true} />

<script>
    import ContextMenu from "./lib/contextMenu/ContextMenu.svelte";
    import { appData } from "./lib/syncData.svelte";
    import { redo, undo } from "./lib/workHistory";
    import NodeSpace from "./nodes/NodeSpace.svelte";
    import { focusData } from "./sidebar/editUtils";
    import SideBar from "./sidebar/SideBar.svelte";

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
</script>

<svelte:window {onkeydown} />
<div class="info">REPAIR v2.0.0</div>
<NodeSpace />
<ContextMenu />
<SideBar />

<style>
    .info {
        position: fixed;
        right: 5px;
        bottom: 5px;
        color: #fff;
        font-size: 12px;
        opacity: 0.8;
        pointer-events: none;
        z-index: 99999;
    }
</style>
