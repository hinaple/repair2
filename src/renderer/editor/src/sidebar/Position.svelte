<script>
    import { addHistory } from "../lib/workHistory";
    import HistoryInput from "./HistoryInput.svelte";

    let { position, oninput = null, previewer = false } = $props();

    const Origin = ["start", "center", "end"];
</script>

<div class="position-input">
    <div class="grid">
        {#each { length: 9 }, i}
            <div
                class="dot"
                class:current={Origin[i % 3] === position.x.origin &&
                    Origin[Math.trunc(i / 3)] === position.y.origin}
                onclick={() => {
                    addHistory({
                        doFn: ({ xOrigin, yOrigin, position }) => {
                            position.x.origin = xOrigin;
                            position.y.origin = yOrigin;
                            oninput?.();
                        },
                        doData: {
                            xOrigin: Origin[i % 3],
                            yOrigin: Origin[Math.trunc(i / 3)],
                            position
                        },
                        undoData: {
                            xOrigin: position.x.origin,
                            yOrigin: position.y.origin,
                            position
                        }
                    });
                }}
            ></div>
        {/each}
    </div>
    <div class="lines">
        {#each ["x", "y"] as axis}
            {@const a = position[axis]}
            <div class="line">
                {axis.toUpperCase()}
                {#if a.origin === "center"}
                    <div class="disabled">중앙</div>
                {:else}
                    <HistoryInput
                        value={a.distance}
                        setter={(d) => {
                            a.distance = +d;
                            oninput?.();
                        }}
                        type="number"
                        placeholder="0"
                        {previewer}
                    />
                    <div
                        class="unit"
                        onclick={() => {
                            addHistory({
                                doFn: ({ value, axis }) => {
                                    axis.relative = value;
                                    oninput?.();
                                },
                                doData: { value: !a.relative, axis: a },
                                undoData: { value: a.relative, axis: a }
                            });
                        }}
                    >
                        {a.relative ? "%" : "px"}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    .position-input {
        display: flex;
        flex-direction: row;
        width: 100%;
        align-items: center;
        gap: 10px;
        flex: 0 0 auto;
    }
    .grid {
        flex: 0 0 auto;
        width: 60px;
        height: 60px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 5px;
    }
    .dot {
        cursor: pointer;
        border: solid rgba(255, 255, 255, 0.4) 1px;
        box-sizing: border-box;
    }
    .dot:nth-child(1) {
        border-top-left-radius: 5px;
    }
    .dot:nth-child(3) {
        border-top-right-radius: 5px;
    }
    .dot:nth-child(7) {
        border-bottom-left-radius: 5px;
    }
    .dot:nth-child(9) {
        border-bottom-right-radius: 5px;
    }
    .dot.current {
        border-color: #4e86ff;
        background-color: rgba(78, 134, 255, 0.5);
    }
    .dot:not(.current):hover {
        border-color: #fff;
        /* background-color: rgba(255, 255, 255, 0.3); */
    }
    .lines {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
    }
    .line {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
        height: 25px;
        width: 100%;
    }
    .line :global(input) {
        flex: 1 1 auto;
        width: 100%;
        height: 25px;
    }
    .unit {
        height: 100%;
        width: 30px;
        flex: 0 0 auto;
        background-color: rgba(255, 255, 255, 0.2);
        color: #fff;
        font-weight: 300;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 5px;
    }
    .disabled {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.8);
        border-radius: 5px;
        font-weight: 400;
    }
</style>
