<script>
    import { onDestroy, onMount } from "svelte";
    import { viewport, rInfo } from "./viewport";
    import FrameUpdater from "../lib/frameUpdater";

    let canvas = $state(null);
    let ctx;

    let vpPos = { x: 0, y: 0 },
        WIDTH,
        HEIGHT;

    const frameUpdater = new FrameUpdater(() => {
        if (!ctx) return;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        let limitedGap = dotGap / 2,
            RG;
        do {
            limitedGap *= 2;
            RG = limitedGap * rInfo.ratio;
        } while (RG < RGlimit);

        const PosInGap = {
            x: (vpPos.x - rInfo.RW / 2) % limitedGap,
            y: (vpPos.y - rInfo.RH / 2) % limitedGap
        };
        const FirstDotPos = {
            x: (PosInGap.x < 0 ? Math.abs(PosInGap.x) : limitedGap - PosInGap.x) * rInfo.ratio,
            y: (PosInGap.y < 0 ? Math.abs(PosInGap.y) : limitedGap - PosInGap.y) * rInfo.ratio
        };

        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";

        for (let x = FirstDotPos.x; x <= WIDTH; x += RG) {
            for (let y = FirstDotPos.y; y <= HEIGHT; y += RG) {
                ctx.beginPath();
                ctx.arc(x, y, dotSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });

    function setCanvas() {
        if (!canvas) return;

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        frameUpdater.draw();
    }

    const unsubs = [
        viewport.screen.subscribe(({ width, height }) => {
            WIDTH = width;
            HEIGHT = height;
            setCanvas();
        }),
        viewport.pos.subscribe(({ x, y }) => {
            vpPos = { x, y };
            frameUpdater.draw();
        })
    ];

    onDestroy(() => {
        unsubs.forEach((u) => u());
    });

    const dotGap = 40,
        dotSize = 1.5,
        RGlimit = 25;

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
    }
</style>
