<script>
    import InputField from "../InputField.svelte";
    import { ElementListenerTypes } from "../../lib/translate";

    const { data } = $props();
</script>

<InputField label="리스너 종류" type="type" value={data} options={ElementListenerTypes} />
<InputField
    label="한 번만 실행"
    value={data.once}
    setter={(d) => (data.once = d)}
    type="checkbox"
/>
{#if data.type === "custom" || data.type === "jsFunction" || data.type === "plugin"}
    <hr />
    <InputField
        label="이벤트 채널명"
        value={data.payload.channel}
        setter={(d) => (data.payload.channel = d)}
    />
{/if}
{#if data.type === "keyPress"}
    <hr />
    <InputField
        label="감지할 버튼"
        value={data.payload.key}
        setter={(d) => (data.payload.key = d)}
        placeholder="모든 키 감지"
    />
{:else if data.type === "jsFunction"}
    <InputField
        label="콜백 함수 코드"
        value={data.payload.scriptData}
        setter={(d) => (data.payload.scriptData = d)}
        type="textarea"
        code
        placeholder="true 반환 시 활성화"
        autoResizeOpt={{ minHeight: 50 }}
    />
{:else if data.type === "plugin"}
    <InputField label="플러그인" value={data.payload.plugin} type="plugin" pluginType="functions" />
{/if}
