<script>
    import Node from "./Node.svelte";
    import { currentFocus, focusData } from "../sidebar/editUtils";
    import { removeNodeWithHistory } from "../lib/syncData.svelte";
    import { EntryTypes } from "../lib/translate";

    let { entry, isLastHold, onmousedown: bubbleMouseDown } = $props();

    function onmousedown(evt) {
        bubbleMouseDown(evt);
        focusData("entry", entry);
    }

    const contextmenu = [
        { label: "플로우 실행", click: () => {} },
        { type: "seperator" },
        { label: "복사", click: () => {} },
        { label: "붙여넣기", click: () => {} },
        { type: "seperator" },
        {
            label: "삭제",
            click: () => {
                removeNodeWithHistory(entry);
                return true;
            },
            action: "remove"
        }
    ];
</script>

<Node
    node={entry}
    outputs={[{ output: entry.output, id: entry.id }]}
    title={entry.alias?.length
        ? entry.alias
        : entry.entryType
          ? entry.entryType === "event"
              ? entry.channel?.length
                  ? entry.channel
                  : "진입점"
              : EntryTypes[entry.entryType]
          : "진입점"}
    {isLastHold}
    {onmousedown}
    isFocused={$currentFocus.obj === entry}
    {contextmenu}
    isEntry
/>

<style>
</style>
