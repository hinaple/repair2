<script>
    import InputField from "./InputField.svelte";
    import { ValueProcessTypes } from "../../lib/translate";
    import { addHistory } from "../../lib/workHistory";

    const { data } = $props();
</script>

<InputField
    label="처리 형태"
    type="select"
    value={data.type}
    setter={(d) => {
        addHistory({
            doFn: ({ type, payload = {} }) => data.changeType(type, payload),
            doData: { type: d },
            undoData: { type: data.type, payload: data.payload }
        });
    }}
    options={ValueProcessTypes}
    manual
/>
<hr />
{#if data.type === "replaceAll"}
    <InputField
        label="변경 전 문자열"
        value={data.payload.from}
        setter={(d) => (data.payload.from = d)}
    />
    <InputField
        label="대체할 문자열"
        value={data.payload.to}
        setter={(d) => (data.payload.to = d)}
    />
{:else if data.type === "removeAll"}
    <InputField
        label="삭제할 문자열"
        value={data.payload.removing}
        setter={(d) => (data.payload.removing = d)}
    />
{:else if data.type === "replaceAllRegex"}
    <InputField
        label="정규표현식"
        value={data.payload.regex}
        setter={(d) => (data.payload.regex = d)}
    />
    <InputField
        label="대체할 문자열"
        value={data.payload.to}
        setter={(d) => (data.payload.to = d)}
        placeholder="$&, $1 등 패턴 사용 가능"
    />
{/if}
