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
<NodeSpace />
<ContextMenu />
<SideBar />
