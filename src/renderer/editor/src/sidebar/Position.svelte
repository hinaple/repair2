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
        <div class="line">
            x
            {#if position.x.origin === "center"}
                <div class="disabled">중앙</div>
            {:else}
                <HistoryInput
                    value={position.x.distance}
                    setter={(d) => {
                        position.x.distance = +d;
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
                            doFn: ({ value, position }) => {
                                position.x.relative = value;
                                oninput?.();
                            },
                            doData: { value: !position.x.relative, position },
                            undoData: { value: position.x.relative, position }
                        });
                    }}
                >
                    {position.x.relative ? "%" : "px"}
                </div>
            {/if}
        </div>
        <div class="line">
            y
            {#if position.y.origin === "center"}
                <div class="disabled">중앙</div>
            {:else}
                <HistoryInput
                    value={position.y.distance}
                    setter={(d) => {
                        position.y.distance = +d;
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
                            doFn: ({ value, position }) => {
                                position.y.relative = value;
                                oninput?.();
                            },
                            doData: { value: !position.y.relative, position },
                            undoData: { value: position.y.relative, position }
                        });
                    }}
                >
                    {position.y.relative ? "%" : "px"}
                </div>
            {/if}
        </div>
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
        gap: 10px;
    }
    .dot {
        cursor: pointer;
        border: solid #fff 2px;
        box-sizing: border-box;
    }
    .dot.current {
        background-color: #fff;
    }
    .dot:not(.current):hover {
        background-color: rgba(255, 255, 255, 0.3);
    }
    .lines {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 10px;
        width: 100%;
    }
    .line {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
        height: 30px;
        width: 100%;
    }
    .line :global(input) {
        flex: 1 1 auto;
        width: 100%;
        height: 30px;
    }
    .unit {
        height: 100%;
        width: 30px;
        flex: 0 0 auto;
        background-color: rgba(255, 255, 255, 0.8);
        color: #000;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }
    .disabled {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #fff;
        color: #000;
        opacity: 0.4;
        font-weight: 600;
    }
</style>
