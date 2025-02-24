<script>
    import InputField from "./InputField.svelte";

    const { data } = $props();
</script>

<InputField label="프로젝트 이름" value={data.title} setter={(d) => (data.title = d)} />
