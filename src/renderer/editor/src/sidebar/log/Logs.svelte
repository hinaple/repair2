<script>
    import { logInfo } from "../../lib/logs/logStore.svelte";
</script>

<div class="logs">
    {#each logInfo.logs.values() as log}
        {log.content}
    {/each}
</div>
