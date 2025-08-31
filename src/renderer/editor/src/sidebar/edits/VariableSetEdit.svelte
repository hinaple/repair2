<script>
    import InputField from "../InputField.svelte";

    const { data } = $props();
</script>

<InputField label="노드 이름" value={data.alias} setter={(d) => (data.alias = d)} />
<InputField
    label="설정할 변수"
    value={data.variable}
    setter={(d) => (data.variable = d)}
    type="variable"
/>
