<script>
    import { addHistory } from "../lib/workHistory";

    let { type, options = {}, onchange = null, ...props } = $props();

    let typeTree = $derived(type.typeTree);
</script>

<div class="types">
    {#each typeTree as tt, i}
        <select
            value={type.types[i]}
            onchange={(e) => {
                type.changeTypeWithHistory(addHistory, e.target.value, i);
                onchange?.();
            }}
            {...props}
        >
            <option value={null} hidden>유형 선택</option>
            {#each tt as t}
                <option value={t}>{options[t] ?? t}</option>
            {/each}
        </select>
    {/each}
</div>

<style>
    .types {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    select {
        padding: 2px 5px;
        border: none;
        background-color: #fff;
        font-family: "Pretend";
        font-size: 20px;
        color: #000;
        font-weight: 600;
    }
</style>
