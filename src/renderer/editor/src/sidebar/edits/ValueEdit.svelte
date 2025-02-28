<script>
    import InputField from "./InputField.svelte";
    import { BaseValueTypes } from "../../lib/translate";
    import { addHistory } from "../../lib/workHistory";

    const { data } = $props();
</script>

<InputField
    label="기본값 종류"
    type="select"
    value={data.baseType}
    setter={(d) => {
        addHistory({
            doFn: ({ type, value = null }) => data.changeBaseType(type, value),
            doData: { type: d },
            undoData: { type: data.baseType, value: data.baseValue }
        });
    }}
    options={BaseValueTypes}
    manual
/>
{#if data.baseType === "string"}
    <InputField
        label="기본값 직접 입력"
        value={data.baseValue}
        setter={(d) => (data.baseValue = d)}
    />
{:else if data.baseType === "variable"}{/if}
