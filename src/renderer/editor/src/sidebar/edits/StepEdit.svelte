<script>
    import InputField from "../InputField.svelte";
    import { StepTypes } from "../../lib/translate";
    import { focusData } from "../editUtils";
    import Components from "./stepEdits/Components.svelte";
    import Audios from "./stepEdits/Audios.svelte";
    import Preloads from "./stepEdits/Preloads.svelte";

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
{#if data.types[0] === "Component"}
    <Components {data} />
{:else if data.types[0] === "Audio"}
    <Audios {data} />
{:else if data.types[0] === "Preload"}
    <Preloads {data} />
{:else if data.types[0] === "delay"}
    <InputField
        label="딜레이(ms)"
        value={data.payload.delayMs}
        setter={(d) => (data.payload.delayMs = d)}
        type="number"
        min="0"
    />
{:else if data.types[0] === "setVariable"}
    <InputField
        label="수정할 변수"
        value={data.payload.variableId}
        setter={(d) => (data.payload.variableId = d)}
        type="variable"
    />
    <InputField
        label="수정할 값"
        value={data.payload.value}
        setter={(d) => (data.payload.value = d)}
        type="input"
    />
{:else if data.types[0] === "executePlugin"}
    <InputField label="플러그인" value={data.payload} type="plugin" pluginType="functions" />
{/if}
