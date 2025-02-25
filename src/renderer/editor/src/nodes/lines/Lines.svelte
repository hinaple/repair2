<script>
    import { onDestroy, onMount } from "svelte";
    import { viewport, rInfo, posFromViewport } from "../viewport";
    import { lines } from "./line";
    import FrameUpdater from "../../lib/frameUpdater";

    let canvas = $state(null);
    let ctx;

    let vpPos = { x: 0, y: 0 },
        WIDTH,
        HEIGHT;

    const frameUpdater = new FrameUpdater(async () => {
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
    }, 2);

    function setCanvas() {
        if (!canvas) return;

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        frameUpdater.draw();
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
            frameUpdater.draw();
        }),
        lines.subscribe((l) => {
            lineArr = l;
            frameUpdater.draw();
        })
    ];

    onDestroy(() => {
        unsubs.forEach((u) => u());
    });

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
