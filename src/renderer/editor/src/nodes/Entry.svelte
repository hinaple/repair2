<script>
    import Node from "./Node.svelte";
    import { currentFocus, focusData } from "../sidebar/editUtils";
    import { removeNodeWithHistory } from "../lib/syncData.svelte";
    import { EntryTypes } from "../lib/translate";
    import { ipcRenderer } from "electron";
    import { genClipboardFn } from "../lib/clipboard";

    let { entry, isLastHold, onmousedown: bubbleMouseDown } = $props();

    function onmousedown(evt) {
        bubbleMouseDown(evt);
        focusData("entry", entry, { clipboardFn });
    }

    const clipboardFn = genClipboardFn("entry", entry, () => removeNodeWithHistory(entry));

    const contextmenu = [
        {
            label: "실행",
            click: () => {
                ipcRenderer.send("request-execute", { type: "node", id: entry.id });
                return true;
            }
        },
        { type: "seperator" },
        {
            label: "잘라내기",
            click: clipboardFn.cut
        },
        {
            label: "복사",
            click: clipboardFn.copy
        },
        {
            label: "붙여넣기",
            click: clipboardFn.paste
        },
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

    let title = $derived.by(() => {
        if (entry.alias?.length) return entry.alias;
        if (entry.data.type === "event" && entry.data.payload.channel?.length)
            return entry.data.payload.channel;
        if (entry.data.type === "shortcut" && entry.data.payload.key?.length)
            return (
                "단축키 " +
                (entry.data.payload.ctrlKey ? "Ctrl+" : "") +
                (entry.data.payload.shiftKey ? "Shift+" : "") +
                entry.data.payload.key.toUpperCase()
            );
        if (entry.data.type === "Communication.serialData" && entry.data.payload.whenDataIs?.length)
            return `시리얼 데이터 수신${entry.data.payload.whenDataIs?.length ? `(${entry.data.payload.whenDataIs})` : ""}`;
        if (entry.data.type === "Communication.Socket.ondata" && entry.data.payload.channel?.length)
            return `소켓 데이터 수신(${entry.data.payload.channel})`;
        return EntryTypes[entry.data.type];
    });
</script>

<Node
    node={entry}
    outputs={[{ output: entry.output, id: entry.id }]}
    {title}
    {isLastHold}
    {onmousedown}
    isFocused={$currentFocus.obj === entry}
    {contextmenu}
    isEntry
/>
