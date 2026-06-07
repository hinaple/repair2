<script>
    import { logInfo } from "../../lib/logs/logStore.svelte";
</script>

<div class="logs">
    {#each logInfo.logs.values() as log}
        {log.detail}
    {/each}
</div>
