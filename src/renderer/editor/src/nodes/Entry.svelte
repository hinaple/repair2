<script>
    import Node from "./Node.svelte";
    import { EntryTypes } from "../lib/translate";

    let { entry, isLastHold, onmousedown, ...nodeData } = $props();

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
            return `소켓 데이터 수신(${entry.data.payload.channel}${entry.data.payload.data?.length ? ":" + entry.data.payload.data : ""})`;
        return EntryTypes[entry.data.type];
    });
</script>

<Node
    node={entry}
    type="entry"
    outputs={[{ output: entry.output, id: entry.id }]}
    {title}
    {isLastHold}
    {onmousedown}
    {...nodeData}
/>
