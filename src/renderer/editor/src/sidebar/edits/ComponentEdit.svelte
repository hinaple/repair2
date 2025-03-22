<script>
    import InputField from "../InputField.svelte";
    import ToggleZone from "./ToggleZone.svelte";
    import { reloadPreview } from "../editUtils";

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
<InputField label="위치" value={data.pos} type="position" previewer oninput={reloadPreview} />
<InputField
    label="Z축 위치"
    value={data.zIndex}
    setter={(d) => (data.zIndex = d)}
    type="number"
    placeholder="값이 클수록 앞에 보임"
/>
<InputField
    label="CSS 코드"
    value={data.style}
    type="textarea"
    code
    setter={(d) => {
        data.style = d;
        reloadPreview();
    }}
    placeholder="inline CSS code"
    autoResizeOpt={{ minHeight: 50 }}
/>
<InputField label="프레임" value={data.frame} type="plugin" pluginType="frames" />
<hr />
<ToggleZone label="트랜지션 설정">
    <InputField label="인트로" value={data.introTransition} type="transition" />
    <InputField label="아웃트로" value={data.outroTransition} type="transition" />
</ToggleZone>
