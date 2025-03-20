<script>
    import { ElementTypes, InputAllowedTypes } from "../../lib/translate";
    import InputField from "../InputField.svelte";
    import Position from "../Position.svelte";
    import ToggleZone from "./ToggleZone.svelte";

    const { data } = $props();
</script>

<InputField label="요소 이름" value={data.alias} setter={(d) => (data.alias = d)} />
<InputField label="요소 종류" value={data} type="type" options={ElementTypes} />
<hr />
{#if data.type === "image" || data.type === "video"}
    <InputField
        label="자원 선택"
        value={data.payload.resourceId}
        setter={(d) => (data.payload.resourceId = d)}
        type="resource"
        elType={data.type}
    />
    <InputField
        label="생성 후 프리로드 제거"
        value={data.payload.removePreload}
        type="checkbox"
        setter={(d) => (data.payload.removePreload = d)}
    />
{/if}
{#if data.type === "input"}
    <InputField
        label="생성 시 자동 선택"
        value={data.payload.autofocus}
        type="checkbox"
        setter={(d) => (data.payload.autofocus = d)}
    />
    <InputField
        label="변수 할당"
        value={data.payload.variableId}
        setter={(d) => (data.payload.variableId = d)}
        type="variable"
    />
    <InputField
        label="플레이스홀더"
        value={data.payload.placeholder}
        setter={(d) => (data.payload.placeholder = d)}
    />
    <InputField
        label="입력 유형"
        value={data.payload.allowedType}
        setter={(d) => (data.payload.allowedType = d)}
        type="select"
        options={InputAllowedTypes}
    />
    {#if data.payload.allowedType === "regex"}
        <InputField
            label="정규표현식"
            value={data.payload.allowedRegex}
            setter={(d) => (data.payload.allowedRegex = d)}
            placeholder="허용할 문자열 정규표현식"
        />
    {/if}
{:else if data.type === "video"}
    <InputField
        label="반복 재생"
        value={data.payload.loop}
        type="checkbox"
        setter={(d) => (data.payload.loop = d)}
    />
    <InputField
        label="음량"
        value={data.payload.volume}
        setter={(d) => (data.payload.volume = d)}
        type="number"
        placeholder="0-100 사이의 실수"
        min="0"
        max="100"
    />
{:else if data.type === "empty"}
    <InputField
        label="내용"
        type="textarea"
        code={data.payload.isHtml}
        placeholder={data.payload.isHtml ? "HTML code" : "문자열"}
        autoResizeOpt={{ minHeight: 50 }}
        value={data.payload.content}
        setter={(d) => (data.payload.content = d)}
    />
    <InputField
        label="HTML로 렌더링"
        value={data.payload.isHtml}
        type="checkbox"
        setter={(d) => (data.payload.isHtml = d)}
    />
{:else if data.type === "plugin"}
    <InputField
        label="플러그인"
        value={data.payload}
        setter={(d) => (data.payload = d)}
        type="plugin"
        pluginType="elements"
    />
{/if}
<hr />
<ToggleZone label="모양 설정">
    {#snippet children()}
        <InputField
            label="전체화면"
            value={data.fullscreen}
            type="checkbox"
            setter={(d) => (data.fullscreen = d)}
        />
        {#if !data.fullscreen}
            <InputField
                label="위치 지정"
                value={data.absolute}
                type="checkbox"
                setter={(d) => (data.absolute = d)}
            />
            {#if data.absolute}
                <Position position={data.pos} />
                <hr />
            {/if}
            <InputField
                label="가로 크기(px)"
                type="number"
                placeholder="자동"
                value={data.width}
                setter={(d) => (data.width = +d ? +d : null)}
            />
            <InputField
                label="세로 크기(px)"
                type="number"
                placeholder="자동"
                value={data.height}
                setter={(d) => (data.height = +d ? +d : null)}
            />
        {/if}
        <hr />
        <InputField
            label="CSS 클래스명"
            value={data.className}
            setter={(d) => (data.className = d)}
            placeholder="띄어쓰기로 구분"
        />
        <InputField
            label="CSS 코드"
            value={data.style}
            type="textarea"
            code
            setter={(d) => (data.style = d)}
            placeholder="inline CSS code"
            autoResizeOpt={{ minHeight: 50 }}
        />
    {/snippet}
</ToggleZone>
