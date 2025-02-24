<script>
    let { icon = "plus", color = "#000", lineWidth = 3, size = 10 } = $props();
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 10 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={`--color: ${color}; --line-width: ${lineWidth}px;`}
>
    {#if icon === "plus"}
        <path class="stroke" d="M5.5 0V10" stroke="black" />
        <path class="stroke" d="M10.5 5L0.5 5" stroke="black" />
    {:else if icon === "hamburger"}
        <rect class="fill" width="10" height="2" fill="black" />
        <rect class="fill" y="4" width="10" height="2" fill="black" />
        <rect class="fill" y="8" width="10" height="2" fill="black" />
    {/if}
</svg>

<style>
    svg {
        display: block;
    }
    .stroke {
        stroke: var(--color);
        stroke-width: var(--line-width);
    }
    .fill {
        fill: var(--color);
    }
</style>
