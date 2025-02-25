<script>
    import InputField from "./InputField.svelte";
    import { StepTypes } from "../../lib/translate";

    const { data } = $props();
</script>

<InputField label="스텝 이름" value={data.title} setter={(d) => (data.title = d)} />
<InputField label="스텝 종류" type="type" value={data} options={StepTypes} />
<hr />
{#if data.type === "RemoveComponent"}
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
