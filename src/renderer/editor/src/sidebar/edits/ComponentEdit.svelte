<script>
    import InputField from "../InputField.svelte";

    const { data } = $props();
</script>

<InputField
    label="컴포넌트 이름"
    value={data.alias}
    setter={(d) => (data.alias = d)}
    placeholder="이름 없는 컴포넌트"
/>
<InputField
    label="보호됨"
    value={data.unbreakable}
    setter={(d) => (data.unbreakable = d)}
    type="checkbox"
/>
<InputField label="표시" value={data.visible} setter={(d) => (data.visible = d)} type="checkbox" />
<InputField label="위치" value={data.pos} type="position" />
<hr />
