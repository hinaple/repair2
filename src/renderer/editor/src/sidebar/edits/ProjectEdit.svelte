<script>
    import InputField from "../InputField.svelte";

    const { data } = $props();
</script>

<InputField label="프로젝트 이름" value={data.title} setter={(d) => (data.title = d)} />
<hr />
<InputField label="화면 너비" value={data.width} setter={(d) => (data.width = d)} type="number" />
<InputField label="화면 높이" value={data.height} setter={(d) => (data.height = d)} type="number" />
<InputField
    label="확대 비율"
    value={data.sizeRatio}
    setter={(d) => (data.sizeRatio = d)}
    placeholder="가로비율,세로비율"
/>
<InputField
    label="다중 화면 모드"
    value={data.multiScreen}
    setter={(d) => (data.multiScreen = d)}
    type="checkbox"
/>
<hr />
<InputField
    label="화면 필터"
    value={data.filter}
    setter={(d) => (data.filter = d)}
    type="textarea"
    code
    placeholder="css filter"
/>
<InputField
    label="CSS style"
    value={data.style}
    setter={(d) => (data.style = d)}
    type="textarea"
    code
    placeholder="inline CSS style"
/>
<hr />
<InputField
    label="편집기 단축키"
    value={data.editorShortcut}
    setter={(d) => (data.editorShortcut = d)}
    maxlength="1"
    placeholder="E"
/>
<InputField
    label="에디터 비밀번호"
    value={data.editorPassword}
    setter={(d) => (data.editorPassword = d)}
    placeholder="비밀번호 없음"
/>
