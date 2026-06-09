<script lang="ts">
    import type { ObjectContentType, SingleLogContent } from "@shared/logContent";

    let { content, type }: { content: Extract<SingleLogContent, object>; type: ObjectContentType } =
        $props();

    let collapsed = $state(true);
</script>

<div class="object-content">
    {#if type === "Array"}
        Array({(content as any[]).length}) [
            {#each collapsed? content(content as any[]) as c}

            {/each}
        ]
    {:else if type === "Object"}{:else if type === "Map"}{:else if type === "Set"}{/if}
</div>
