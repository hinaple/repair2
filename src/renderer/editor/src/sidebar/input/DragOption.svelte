<script>
    import Coord from "@renderer/classes/coord";
    import InputField from "./InputField.svelte";
    import * as Easings from "easing-utils";

    let { dragOption, previewer = false } = $props();
</script>

<InputField
    label="드래그 사용"
    value={dragOption.use}
    type="checkbox"
    setter={(d) => (dragOption.use = d)}
/>
{#if dragOption.use}
    <InputField
        label="놓으면 위치 복귀"
        value={dragOption.returnOnRelease}
        type="checkbox"
        setter={(d) => (dragOption.returnOnRelease = d)}
    />
    {#if dragOption.returnOnRelease}
        <InputField
            label="복귀 시간(ms)"
            type="number"
            placeholder="0"
            value={dragOption.returnDuration}
            setter={(d) => {
                dragOption.returnDuration = +d;
            }}
        />
    {/if}
    <InputField
        label="인식 허용치(px)"
        type="number"
        placeholder="0"
        value={dragOption.threshold}
        setter={(d) => {
            dragOption.threshold = +d;
        }}
    />
    <InputField
        label="스냅"
        type="select"
        options={{
            never: "없음",
            drag: "드래그 도중",
            release: "놓았을 때"
        }}
        value={dragOption.snapOn}
        setter={(d) => {
            dragOption.snapOn = d;
        }}
    />
    {#if dragOption.snapOn !== "never"}
        <InputField
            label="스냅 시간(ms)"
            type="number"
            placeholder="0"
            value={dragOption.snapDuration}
            setter={(d) => {
                dragOption.snapDuration = +d;
            }}
        />
    {/if}
    <InputField
        label="easing"
        placeholder="ease"
        type="select"
        options={Object.keys(Easings)}
        value={dragOption.moveEasing}
        setter={(d) => {
            dragOption.moveEasing = d;
        }}
    />
    <InputField
        label="인식 좌표"
        type="position"
        style="padding: 5px 5px 10px 10px; border-radius: 5px; border: solid rgba(255, 255, 255, .2) 1px;"
        seriesOption={{
            array: dragOption.hotspots,
            label: (idx) => `좌표${idx}`,
            newData: () => new Coord()
        }}
    />
{/if}
