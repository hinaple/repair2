<script lang="ts">
  import { onDestroy } from "svelte";
  import { startMonitoring } from "../lib/runtimeMonitor.svelte";
  import { EntryTypes } from "../lib/translate";
  import { getMutator } from "../project/store";
  import Node from "./Node.svelte";
  import type { Types } from "@shared/projectData/types";

  let {
    id,
    isLastHold = false,
    onpointerdown = () => {}
  }: {
    id: string;
    isLastHold?: boolean;
    onpointerdown?: (event: PointerEvent) => unknown;
  } = $props();
  const editor = $derived(getMutator().record<"nodes", Types.Entry>("nodes", id));
  const entry = $derived(editor.value);

  let title = $derived.by(() => {
    if (entry.alias?.length) return entry.alias;
    if (entry.type === "event" && entry.payload.channel?.length) return entry.payload.channel;
    if (entry.type === "shortcut" && entry.payload.key?.length)
      return `단축키 ${entry.payload.ctrlKey ? "Ctrl+" : ""}${entry.payload.altKey ? "Alt+" : ""}${entry.payload.shiftKey ? "Shift+" : ""}${entry.payload.metaKey ? "Win+" : ""}${entry.payload.key.toUpperCase()}`;
    if (entry.type === "Communication.serialData" && entry.payload.whenDataIs?.length)
      return `시리얼 데이터 수신(${entry.payload.whenDataIs})`;
    if (entry.type === "Communication.Socket.ondata" && entry.payload.channel?.length)
      return `소켓 데이터 수신(${entry.payload.channel}${entry.payload.data?.length ? `:${entry.payload.data}` : ""})`;
    return EntryTypes[entry.type as keyof typeof EntryTypes] ?? "진입점";
  });

  let activated = $state(false);
  const unsubscribe = startMonitoring("entries", id, (value) => (activated = value));
  onDestroy(unsubscribe);
  let color = $derived(entry.standbyMode ? (activated ? "var(--orange)" : "#555555") : "#000");
</script>

<Node
  {id}
  outputs={[{ binding: editor.field("output"), id }]}
  hasInput={entry.standbyMode}
  {title}
  {isLastHold}
  {onpointerdown}
  {color}
/>
