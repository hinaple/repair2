<script>
    import Coord from "@classes/coord";
    import InputField from "./InputField.svelte";
    import { addHistory } from "../lib/workHistory";
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
    <InputField label="인식 좌표">
        {#each dragOption.hotspots as hotspot, idx}
            <InputField
                label={`좌표${idx}`}
                type="position"
                value={hotspot}
                background
                style="padding: 5px 10px 10px 10px; margin-bottom: 5px;"
                oninputremove={() =>
                    addHistory({
                        doFn: (idx) => dragOption.hotspots.splice(idx, 1),
                        undoFn: ({ idx, pos }) => dragOption.hotspots.splice(idx, 0, pos),
                        doData: idx,
                        undoData: { idx: idx, pos: hotspot }
                    })}
            />
        {/each}

        <div
            class="add"
            onclick={() =>
                addHistory({
                    doFn: (pos) => dragOption.hotspots.push(pos),
                    undoFn: () => dragOption.hotspots.pop(),
                    doData: new Coord()
                })}
        >
            좌표 추가
        </div>
    </InputField>
{/if}

<style>
    .add {
        cursor: pointer;
        background-color: #fff;
        color: #000;
        font-weight: 600;
        opacity: 0.8;
        padding: 10px;
        text-align: center;
        border-radius: 10px;
    }
    .add:hover {
        opacity: 1;
    }
</style>
