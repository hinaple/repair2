<script>
    import InputField from "../../input/InputField.svelte";
    import { StepTypes } from "../../../lib/translate";
    import { focusData } from "../../editUtils";
    import Components from "./stepEdits/Components.svelte";
    import Audios from "./stepEdits/Audios.svelte";
    import Preloads from "./stepEdits/Preloads.svelte";
    import Communication from "./stepEdits/Communications.svelte";
    import { pasted } from "../../../lib/clipboard";
    import RuntimePluginStep from "./stepEdits/RuntimePluginStep.svelte";

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
                    paste: () => pasted({ type: "component", obj: data.payload })
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
{:else if data.type === "Others.customReset"}
    <InputField
        label="음향 초기화"
        value={data.payload.audios}
        setter={(d) => (data.payload.audios = d)}
        type="checkbox"
    />
    <InputField
        label="변수 초기화"
        value={data.payload.variables}
        setter={(d) => (data.payload.variables = d)}
        type="checkbox"
    />
    <InputField
        label="컴포넌트 전체 삭제"
        value={data.payload.components}
        setter={(d) => (data.payload.components = d)}
        type="checkbox"
    />
    <InputField
        label="스텝 초기화"
        value={data.payload.steps}
        setter={(d) => (data.payload.steps = d)}
        type="checkbox"
    />
    <InputField
        label="프리로드 초기화"
        value={data.payload.preloads}
        setter={(d) => (data.payload.preloads = d)}
        type="checkbox"
    />
    <InputField
        label="활성 진입점 초기화"
        value={data.payload.entries}
        setter={(d) => (data.payload.entries = d)}
        type="checkbox"
    />
    <InputField
        label="런타임 플러그인 초기화"
        value={data.payload.runtimePlugins}
        setter={(d) => (data.payload.runtimePlugins = d)}
        type="checkbox"
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
    <InputField
        label="플러그인"
        value={data.payload.plugin}
        type="plugin"
        pluginType="function"
        canUnselect={false}
    />
    <InputField
        label="끝날 때까지 기다리기"
        value={data.payload.waitTillEnd}
        setter={(d) => (data.payload.waitTillEnd = d)}
        type="checkbox"
    />
{:else if data.type === "Others.runtimePluginStep"}
    <RuntimePluginStep {data} />
{:else if data.type === "Others.script"}
    <InputField
        label="스크립트 코드"
        value={data.payload.code}
        setter={(d) => (data.payload.code = d)}
        type="textarea"
        code
        placeholder="//Enter JS script"
        autoResizeOpt={{ minHeight: 100 }}
    />
{:else if data.type === "Others.log"}
    <InputField
        label="로그 내용"
        value={data.payload.content}
        setter={(d) => (data.payload.content = d)}
        type="textarea"
    />
{/if}
