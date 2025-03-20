<script>
    import InputField from "../../InputField.svelte";
    import { ComponentModifyTypes, ComponentModifyInputData } from "../../../lib/translate";

    const { data } = $props();
</script>

{#if data.types[1] === "remove"}
    <InputField
        label="삭제할 컴포넌트 이름"
        value={data.payload.componentAlias}
        setter={(d) => (data.payload.componentAlias = d)}
    />
    <InputField
        label="보호된 컴포넌트여도 제거"
        value={data.payload.ignoreUnbreakable}
        setter={(d) => (data.payload.ignoreUnbreakable = d)}
        type="checkbox"
    />
{:else if data.types[1] === "modify"}
    <InputField
        label="수정할 컴포넌트 이름"
        value={data.payload.componentAlias}
        setter={(d) => (data.payload.componentAlias = d)}
    />
    <InputField
        label="수정할 속성"
        value={data.payload.modifyKey}
        setter={(d) => (data.payload.modifyKey = d)}
        type="select"
        options={ComponentModifyTypes}
    />
    {#if data.payload.modifyKey}
        <InputField
            value={data.payload.modifyValue}
            setter={(d) => (data.payload.modifyValue = d)}
            {...ComponentModifyInputData[data.payload.modifyKey]}
        />
    {/if}
{:else if data.types[1] === "clear"}
    <InputField
        label="보호된 컴포넌트까지 제거"
        value={data.payload.ignoreUnbreakable}
        setter={(d) => (data.payload.ignoreUnbreakable = d)}
        type="checkbox"
    />
{/if}
