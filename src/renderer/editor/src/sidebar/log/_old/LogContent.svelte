<script lang="ts">
    import {
        ObjectContents,
        type ObjectContentType,
        type SingleLogContent
    } from "@shared/logContent";
    import ObjectContent from "./ObjectContent.svelte";

    let { content }: { content: SingleLogContent } = $props();

    const [signedType, type]: [boolean, string] = $derived.by(() => {
        if (content === null) return [false, "null"];
        if (content === undefined) return [false, "undefined"];
        const t = typeof content;
        if (t !== "object") return [false, t];
        if ("_type" in (content as object))
            return [
                true,
                (content as any)._type as "Error" | "function" | "symbol" | "bigint" | string
            ];
        const instance = content?.constructor?.name;
        return [false, instance || t];
    });
    $inspect(type, content);
</script>

{#if (ObjectContents as readonly string[]).includes(type)}
    <ObjectContent
        type={type as ObjectContentType}
        content={content as Extract<SingleLogContent, object>}
    />
{:else}
    <span class={type}>{String(content) + (type === "bigint" ? "n" : "")}</span>
{/if}

<style>
    span {
        white-space: pre-wrap;
        word-break: break-all;
    }
    .number {
        color: #9980ff;
    }
    .bigint {
        color: #aaa;
    }
</style>
