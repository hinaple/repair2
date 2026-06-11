<script>
    import { onDestroy, onMount } from "svelte";
    import { viewport, rInfo, posFromViewport, isBoundOutViewport } from "../viewport";
    import { lines } from "./line";
    import FrameUpdater from "../../lib/frameUpdater";
    import { makeBezierPoints } from "./getBezierPoints";

    let canvas = $state(null);
    /** @type {CanvasRenderingContext2D} */
    let ctx;

    let WIDTH, HEIGHT, PW, PH;
    let vpPos;

    function drawBezierLine(lineWidth, ...args) {
        let x1 = args[0],
            y1 = args[1];
        let x2 = x1,
            y2 = y1;
        for (let i = 2; i < args.length; i += 2) {
            if (x1 > args[i]) x1 = args[i];
            if (y1 > args[i + 1]) y1 = args[i + 1];
            if (x2 < args[i]) x2 = args[i];
            if (y2 < args[i + 1]) y2 = args[i + 1];
        }
        const halfLine = lineWidth / 2;
        if (isBoundOutViewport(x1 - halfLine, y1 - halfLine, x2 + halfLine, y2 + halfLine)) return;
        ctx.bezierCurveTo(...args);

        ctx.stroke();
    }

    let points = null;
    let pointUpdateRequired = true;
    function updatePoints() {
        points = makeBezierPoints(lineArr);
        pointUpdateRequired = false;
    }

    const frameUpdater = new FrameUpdater(async () => {
        if (!ctx) return;

        if (pointUpdateRequired) updatePoints();

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        ctx.strokeStyle = "#000";
        ctx.lineCap = "round";
        const lineWidth = 3 * rInfo.ratio;
        ctx.lineWidth = lineWidth;

        points.forEach((pp) => {
            const pointsInVP = pp
                .map((p) => posFromViewport(...p, vpPos))
                .reduce((arr, p) => {
                    arr.push(p.x, p.y);
                    return arr;
                }, []);
            ctx.beginPath();
            ctx.moveTo(pointsInVP[0], pointsInVP[1]);
            drawBezierLine(lineWidth, ...pointsInVP.toSpliced(0, 2));
        });
    }, 2);

    function setCanvas() {
        if (!canvas) return;

        canvas.width = PW;
        canvas.height = PH;

        ctx?.setTransform(PW / WIDTH, 0, 0, PH / HEIGHT, 0, 0);

        frameUpdater.draw();
    }

    let lineArr = [];
    const unsubs = [
        viewport.screen.subscribe(({ width, height, pixelWidth, pixelHeight }) => {
            WIDTH = width;
            HEIGHT = height;
            PW = pixelWidth;
            PH = pixelHeight;
            setCanvas();
        }),
        viewport.pos.subscribe((pos) => {
            vpPos = pos;
            frameUpdater.draw();
        }),
        lines.subscribe((l) => {
            lineArr = l;
            pointUpdateRequired = true;
            frameUpdater.draw();
        }),
        function () {
            frameUpdater.destroy();
        }
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
