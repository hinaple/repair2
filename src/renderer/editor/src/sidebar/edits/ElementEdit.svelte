<script>
    import { ElementTypes } from "../../lib/translate";
    import InputField from "../InputField.svelte";
    import Position from "../Position.svelte";

    const { data } = $props();
</script>

<InputField label="요소 이름" value={data.alias} setter={(d) => (data.alias = d)} />
<InputField label="요소 종류" value={data} type="type" options={ElementTypes} />
<hr />
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
    setter={(d) => (data.width = +d ? +d : null)}
/>
<hr />
{#if data.type === "input"}
    <InputField
        label="변수 할당"
        value={data.payload.variableId}
        setter={(d) => (data.payload.variableId = d)}
        type="variable"
    />
{/if}
