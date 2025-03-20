<script>
    import { addHistory } from "../../../lib/workHistory";
    import InputField from "../../InputField.svelte";

    const { data } = $props();
</script>

{#if data.types[1] === "add" || data.types[1] === "release"}
    <InputField label="자원 목록">
        {#snippet children()}
            <div class="resource-list">
                {#each data.payload.resourceArr as resourceId, i}
                    <InputField
                        value={resourceId}
                        setter={(d) => (data.payload.resourceArr[i] = d)}
                        type="resource"
                        removable
                        onremove={() =>
                            addHistory({
                                doFn: (idx) => data.payload.resourceArr.splice(idx, 1),
                                undoFn: ({ idx, rId }) =>
                                    data.payload.resourceArr.splice(idx, 0, rId),
                                doData: i,
                                undoData: { idx: i, rId: resourceId }
                            })}
                    />
                {/each}
                <div
                    class="add"
                    onclick={() =>
                        addHistory({
                            doFn: () => data.payload.resourceArr.push(null),
                            undoFn: () => data.payload.resourceArr.pop()
                        })}
                >
                    자원 추가
                </div>
            </div>
        {/snippet}
    </InputField>
{/if}

<style>
    .resource-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    .add {
        cursor: pointer;
        background-color: #fff;
        color: #000;
        font-weight: 600;
        opacity: 0.8;
        padding: 10px;
        text-align: center;
        border-radius: 10px;
    }
    .add:hover {
        opacity: 1;
    }
</style>
