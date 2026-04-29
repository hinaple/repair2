<script>
    import { onDestroy, onMount } from "svelte";
    import { viewport, rInfo, posFromViewport } from "../viewport";
    import { lines } from "./line";
    import FrameUpdater from "../../lib/frameUpdater";

    let canvas = $state(null);
    /** @type {CanvasRenderingContext2D} */
    let ctx;

    let vpPos = { x: 0, y: 0 },
        WIDTH,
        HEIGHT;

    const BEZIER_OFFSET = 50;

    const frameUpdater = new FrameUpdater(async () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        ctx.strokeStyle = "#000";
        ctx.lineCap = "round";
        ctx.lineWidth = 3 * rInfo.ratio;

        const currentBezierOffset = BEZIER_OFFSET * rInfo.ratio;
        lineArr.forEach((l) => {
            ctx.beginPath();
            const from = posFromViewport(l.fromCoord.x, l.fromCoord.y);
            const to = posFromViewport(l.toCoord.x, l.toCoord.y);
            ctx.moveTo(from.x, from.y);
            if (l.noBezier) ctx.lineTo(to.x, to.y);
            else if (l.fromId === l.output.to) {
                ctx.bezierCurveTo(
                    from.x + currentBezierOffset,
                    from.y,
                    from.x + currentBezierOffset,
                    from.y - currentBezierOffset,
                    (from.x + to.x) / 2,
                    from.y - currentBezierOffset
                );
                ctx.bezierCurveTo(
                    to.x - currentBezierOffset,
                    to.y - currentBezierOffset,
                    to.x - currentBezierOffset,
                    to.y,
                    to.x,
                    to.y
                );
            } else if (to.x <= from.x) {
                const yCenter = (from.y + to.y) / 2;
                ctx.bezierCurveTo(
                    from.x + currentBezierOffset,
                    from.y,
                    from.x + currentBezierOffset,
                    (from.y + yCenter) / 2,
                    (from.x + to.x) / 2,
                    yCenter
                );
                ctx.bezierCurveTo(
                    to.x - currentBezierOffset,
                    (to.y + yCenter) / 2,
                    to.x - currentBezierOffset,
                    to.y,
                    to.x,
                    to.y
                );
            } else {
                ctx.bezierCurveTo(
                    Math.max(from.x + currentBezierOffset, (to.x + from.x) / 2),
                    from.y,
                    Math.min(to.x - currentBezierOffset, (to.x + from.x) / 2),
                    to.y,
                    to.x,
                    to.y
                );
            }
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
