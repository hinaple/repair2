<script lang="ts">
    import type { LogEntry } from "@shared/log.types";
    import LogContent from "./LogContent.svelte";

    let { log }: { log: LogEntry } = $props();
</script>

<div class={["log", log.level]}>
    {#each log.content as content}
        <LogContent {content} />
    {/each}
</div>

<style>
    .log {
        flex: 0 0 auto;
        font-family: consolas;
        font-size: 14px;
        border-bottom: solid #fff5 1px;
        box-sizing: border-box;
        min-height: 15px;
        padding-inline: 3px;

        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
    }
</style>
