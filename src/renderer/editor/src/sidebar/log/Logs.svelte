<script>
    import { logKeys, logs } from "../../lib/logs/logStore.svelte";
</script>

<div class="logs">
    {#each logKeys as l}
        {logs.get(l)}
    {/each}
</div>
