<script>
    import { onDestroy, onMount } from "svelte";
    import { viewport, rInfo, posFromViewport } from "../viewport";
    import { lines } from "./line";

    let canvas = $state(null);
    let ctx;

    let vpPos = { x: 0, y: 0 },
        WIDTH,
        HEIGHT;

    function setCanvas() {
        if (!canvas) return;

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        draw();
    }

    let lineArr = [];
    const unsubs = [
        viewport.screen.subscribe(({ width, height }) => {
            WIDTH = width;
            HEIGHT = height;
            setCanvas();
        }),
        viewport.pos.subscribe(({ x, y }) => {
            vpPos = { x, y };
            draw();
        }),
        lines.subscribe((l) => {
            lineArr = l;
            draw();
        })
    ];

    onDestroy(() => {
        unsubs.forEach((u) => u());
    });

    function draw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        ctx.strokeStyle = "#000";
        ctx.lineCap = "round";
        ctx.lineWidth = 3 * rInfo.ratio;
        lineArr.forEach((l) => {
            ctx.beginPath();
            const from = posFromViewport(l.fromCoord.x, l.fromCoord.y);
            const to = posFromViewport(l.toCoord.x, l.toCoord.y);
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        });
    }

    onMount(() => {
        ctx = canvas.getContext("2d");
        setCanvas();
    });
</script>

<canvas bind:this={canvas}></canvas>

<style>
    canvas {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
</style>
