<script>
    import { onDestroy, onMount } from "svelte";
    import { viewport, rInfo, posFromViewport } from "./viewport";
    import FrameUpdater from "../lib/frameUpdater";

    let canvas = $state(null);
    /** @type {CanvasRenderingContext2D | null} */
    let ctx;

    let vpPos = { x: 0, y: 0 },
        WIDTH,
        HEIGHT,
        PW,
        PH;

    const CENTER_CROSS_LEN = 20;
    const frameUpdater = new FrameUpdater(() => {
        if (!ctx) return;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        const crossSize = CENTER_CROSS_LEN * rInfo.ratio;
        const CenterPos = posFromViewport(0, 0);
        ctx.beginPath();
        ctx.moveTo(CenterPos.x, CenterPos.y - crossSize);
        ctx.lineTo(CenterPos.x, CenterPos.y + crossSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(CenterPos.x - crossSize, CenterPos.y);
        ctx.lineTo(CenterPos.x + crossSize, CenterPos.y);
        ctx.stroke();

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

        canvas.width = PW;
        canvas.height = PH;

        ctx?.setTransform(PW / WIDTH, 0, 0, PH / HEIGHT, 0, 0);

        ctx.fillStyle = "#0007";
        ctx.strokeStyle = "#0007";
        ctx.lineWidth = 2;

        frameUpdater.draw();
    }

    const unsubs = [
        viewport.screen.subscribe(({ width, height, pixelWidth, pixelHeight }) => {
            WIDTH = width;
            HEIGHT = height;
            PW = pixelWidth;
            PH = pixelHeight;
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
