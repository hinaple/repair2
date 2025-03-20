<script>
    import InputField from "../InputField.svelte";
    import { ComparisonOperatorTypes } from "../../lib/translate";
    import { addHistory } from "../../lib/workHistory";

    const { data } = $props();
</script>

<InputField label="분기점 이름" value={data.alias} setter={(d) => (data.alias = d)} />
<InputField
    label="비교 연산자"
    type="select"
    options={ComparisonOperatorTypes}
    value={data.operator}
    setter={(d) => {
        addHistory({
            doFn: ({ operator, scriptData = null }) => {
                data.operator = operator;
                data.scriptData = scriptData;
            },
            doData: { operator: d },
            undoData: { operator: data.operator, scriptData: data.scriptData }
        });
    }}
    manual
/>
{#if data.operator === "scriptFile"}
    <InputField
        label="스크립트 파일"
        value={data.scriptData}
        setter={(d) => (data.scriptData = d)}
        type="resource"
        elType="script"
    />
{:else if data.operator === "jsFunction"}
    <InputField
        label="콜백 함수 코드"
        value={data.scriptData}
        setter={(d) => (data.scriptData = d)}
        type="textarea"
        code
        placeholder="(valueA, valueB) => valueA === valueB"
        autoResizeOpt={{ minHeight: 50 }}
    />
{/if}
<InputField
    label="'참' 발동 이후 비활성화"
    type="checkbox"
    value={data.disableAfterTrue}
    setter={(d) => (data.disableAfterTrue = d)}
/>
<InputField
    label="'거짓' 발동 이후 비활성화"
    type="checkbox"
    value={data.disableAfterFalse}
    setter={(d) => (data.disableAfterFalse = d)}
/>
