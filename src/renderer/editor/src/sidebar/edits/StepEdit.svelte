<script>
    import InputField from "../InputField.svelte";
    import { StepTypes } from "../../lib/translate";
    import { focusData } from "../editUtils";
    import Components from "./stepEdits/Components.svelte";
    import Audios from "./stepEdits/Audios.svelte";
    import Preloads from "./stepEdits/Preloads.svelte";
    import Communication from "./stepEdits/Communications.svelte";
    import { pasted } from "../../lib/clipboard";

    const { data } = $props();
</script>

<InputField label="스텝 이름" value={data.title} setter={(d) => (data.title = d)} />
<InputField
    label="스텝 유형"
    type="type"
    value={data}
    options={StepTypes}
    onchange={() => {
        if (data.type === "Component.create")
            focusData("component", data.payload, {
                preview: data.payload,
                clipboardFn: {
                    paste: (_, string) => pasted(string, { type: "component", obj: data.payload })
                }
            });
    }}
/>
<hr />
{#if data.types[0] === "Component"}
    <Components {data} />
{:else if data.types[0] === "Audio"}
    <Audios {data} />
{:else if data.types[0] === "Preload"}
    <Preloads {data} />
{:else if data.types[0] === "Communication"}
    <Communication {data} />
{:else if data.types[0] === "delay"}
    <InputField
        label="딜레이(ms)"
        value={data.payload.delayMs}
        setter={(d) => (data.payload.delayMs = d)}
        type="number"
        min="0"
    />
{:else if data.type === "Others.eventEmit"}
    <InputField
        label="이벤트 채널"
        value={data.payload.channel}
        setter={(d) => (data.payload.channel = d)}
    />
    <InputField
        label="데이터"
        value={data.payload.data}
        setter={(d) => (data.payload.data = d)}
        type="textarea"
    />
{:else if data.type === "Others.setVariable"}
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
{:else if data.type === "Others.executePlugin"}
    <InputField label="플러그인" value={data.payload.plugin} type="plugin" pluginType="functions" />
    <InputField
        label="끝날 때까지 기다리기"
        value={data.payload.waitTillEnd}
        setter={(d) => (data.payload.waitTillEnd = d)}
        type="checkbox"
    />
{/if}
