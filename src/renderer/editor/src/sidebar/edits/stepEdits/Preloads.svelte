<script>
    import InputField from "../../InputField.svelte";

    const { data } = $props();
</script>

{#if data.types[1] === "add" || data.types[1] === "release"}
    <InputField
        label="자원 목록"
        type="resource"
        seriesOption={{ array: data.payload.resourceArr }}
    />
{/if}
