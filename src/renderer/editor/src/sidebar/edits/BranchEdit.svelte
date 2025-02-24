<script>
    import InputField from "./InputField.svelte";
    import { ComparisonOperatorTypes } from "../../lib/translate";

    const { data } = $props();
</script>

<InputField label="분기점 이름" value={data.alias} setter={(d) => (data.alias = d)} />
<InputField
    label="비교 연산자"
    type="select"
    options={ComparisonOperatorTypes}
    value={data.operator}
    setter={(d) => (data.operator = d)}
/>
