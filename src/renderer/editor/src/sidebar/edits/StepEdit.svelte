<script>
    import InputField from "../InputField.svelte";
    import { StepTypes } from "../../lib/translate";
    import { focusData } from "../editUtils";

    const { data } = $props();
</script>

<InputField label="스텝 이름" value={data.title} setter={(d) => (data.title = d)} />
<InputField
    label="스텝 종류"
    type="type"
    value={data}
    options={StepTypes}
    onchange={() => {
        if (data.type === "Component.create") focusData("component", data.payload);
    }}
/>
<hr />
{#if data.type === "Component.remove"}
    <InputField
        label="삭제할 컴포넌트 이름"
        value={data.payload.componentAlias}
        setter={(d) => data.changePayloadValue("componentAlias", d)}
    />
    <InputField
        label="보호돼있어도 삭제"
        value={data.payload.ignoreUnbreakable}
        setter={(d) => data.changePayloadValue("ignoreUnbreakable", d)}
        type="checkbox"
    />
{/if}
