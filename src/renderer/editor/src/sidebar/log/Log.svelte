<script lang="ts">
    import type { LogEntry } from "@shared/log.types";

    let { log }: { log: LogEntry } = $props();
</script>

<div class="log">
    <span class="title">{log.content}</span>
</div>
