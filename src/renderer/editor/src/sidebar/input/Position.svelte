<script lang="ts">
  import type { FieldBinding } from "../../project/mutator";
  import HistoryInput from "./HistoryInput.svelte";

  let {
    binding,
    oninput = null,
    previewer = false
  }: {
    binding: FieldBinding<any>;
    oninput?: (() => unknown) | null;
    previewer?: boolean;
  } = $props();

  let position = $derived(binding.value);
  const Origin = ["start", "center", "end"] as const;

  function setOrigins(xOrigin: string, yOrigin: string) {
    binding.set({
      ...position,
      x: { ...position.x, origin: xOrigin },
      y: { ...position.y, origin: yOrigin }
    });
    oninput?.();
  }
</script>

<div class="position-input">
  <div class="grid">
    {#each { length: 9 }, i}
      <div
        class="dot"
        class:current={Origin[i % 3] === position.x.origin &&
          Origin[Math.trunc(i / 3)] === position.y.origin}
        onclick={() => setOrigins(Origin[i % 3], Origin[Math.trunc(i / 3)])}
      ></div>
    {/each}
  </div>
  <div class="lines">
    {#each ["x", "y"] as axis}
      {@const a = position[axis]}
      {@const axisBinding = binding.at(axis)}
      <div class="line">
        {axis.toUpperCase()}
        {#if a.origin === "center"}
          <div class="disabled">중앙</div>
        {:else}
          <HistoryInput
            binding={axisBinding.at("distance")}
            type="number"
            placeholder="0"
            {previewer}
            onpreview={oninput}
          />
          <div
            class="unit"
            onclick={() => {
              axisBinding.at("relative").set(!a.relative);
              oninput?.();
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
    border-color: var(--blue-bright);
    background-color: rgba(78, 134, 255, 0.5);
  }
  .dot:not(.current):hover {
    border-color: #fff;
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
    background-color: var(--w-o2);
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
    background-color: var(--w-o2);
    color: var(--w-o8);
    border-radius: 5px;
    font-weight: 400;
  }
</style>
