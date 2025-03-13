<script>
    import InputField from "../InputField.svelte";

    const { data } = $props();
</script>

<InputField
    label="시퀀스 이름"
    value={data.alias}
    setter={(d) => (data.alias = d)}
    placeholder="이름 없는 시퀀스"
/>
