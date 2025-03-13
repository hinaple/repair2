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
    {:else if icon === "arrow"}
        <path class="stroke" d="M0 5H8" stroke="black" />
        <path class="stroke" d="M4 1L8 5L4 9" stroke="black" />
    {:else if icon === "edit"}
        <path class="fill" d="M3 10L0 7V10H3Z" fill="black" />
        <path class="fill" d="M4 9L1 6L7 0L10 3L4 9Z" fill="black" />
    {:else if icon === "bin"}
        <path class="fill" d="M5.5 0H4.5V1H0V2H10V1H5.5V0Z" fill="black" />
        <path
            class="fill"
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M3.5 9L2.48639 2.91779H1.49323L2.65287 10H7.50677L8.5 2.91779H7.50677L6.65965 9H3.5Z"
            fill="black"
        />
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
