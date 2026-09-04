<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { viewport, rInfo, posFromViewport, isBoundOutViewport } from "../viewport";
  import { getLines, subscribeLines, type Output } from "./output";
  import FrameUpdater from "../../lib/frameUpdater";
  import { makeBezierPoint } from "./getBezierPoints";

  let canvas: HTMLCanvasElement | null = $state(null);
  let ctx: CanvasRenderingContext2D | null;

  let WIDTH: number, HEIGHT: number, PW: number, PH: number;
  let vpPos: Record<"x" | "y", number>;

  type CurveData = number[];
  type SegmentPoints = [number, number, number, number, number, number, number, number];

  function drawBezierLine(lineWidth: number, points: SegmentPoints) {
    let x1 = points[0],
      y1 = points[1];
    let x2 = x1,
      y2 = y1;
    for (let i = 2; i < points.length; i += 2) {
      if (x1 > points[i]) x1 = points[i];
      if (y1 > points[i + 1]) y1 = points[i + 1];
      if (x2 < points[i]) x2 = points[i];
      if (y2 < points[i + 1]) y2 = points[i + 1];
    }
    const halfLine = lineWidth / 2;
    if (isBoundOutViewport(x1 - halfLine, y1 - halfLine, x2 + halfLine, y2 + halfLine)) return;

    ctx!.beginPath();
    ctx!.moveTo(points[0], points[1]);
    ctx!.bezierCurveTo(points[2], points[3], points[4], points[5], points[6], points[7]);
    ctx!.stroke();
  }

  const bezierPoints: Map<string, CurveData> = new Map();
  const lineChanges = {
    reset: false,
    changes: new Map<string, boolean>() //true: set, false: remove
  };
  let pointUpdateRequired = false;

  function updatePoints() {
    const lines = getLines();
    if (lineChanges.reset) {
      bezierPoints.clear();
      lines.forEach((l, id) => {
        bezierPoints.set(id, makeBezierPoint(l));
      });
      lineChanges.reset = false;
    } else {
      lineChanges.changes.forEach((isSet, id) => {
        if (!isSet) {
          bezierPoints.delete(id);
          return;
        }
        const l = lines.get(id);
        l && bezierPoints.set(id, makeBezierPoint(l));
      });
    }

    lineChanges.changes.clear();
    pointUpdateRequired = false;
  }

  function drawCurve(points: CurveData, lineWidth: number) {
    for (let i = 0; i < points.length; i += 8) {
      const p0 = posFromViewport(points[i + 0], points[i + 1], vpPos);
      const p1 = posFromViewport(points[i + 2], points[i + 3], vpPos);
      const p2 = posFromViewport(points[i + 4], points[i + 5], vpPos);
      const p3 = posFromViewport(points[i + 6], points[i + 7], vpPos);
      drawBezierLine(lineWidth, [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]);
    }
  }

  const frameUpdater = new FrameUpdater(async () => {
    if (!ctx) return;

    if (pointUpdateRequired) updatePoints();

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    const lineWidth = 3 * rInfo.ratio;
    ctx.lineWidth = lineWidth;

    bezierPoints.forEach((points) => drawCurve(points, lineWidth));
  }, 2);

  function setCanvas() {
    if (!canvas) return;

    canvas.width = PW;
    canvas.height = PH;

    ctx?.setTransform(PW / WIDTH, 0, 0, PH / HEIGHT, 0, 0);

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
    viewport.pos.subscribe((pos) => {
      vpPos = pos;
      frameUpdater.draw();
    }),
    subscribeLines((type, id) => {
      if (lineChanges.reset) return;

      pointUpdateRequired = true;
      frameUpdater.draw();
      if (type === "reset") {
        lineChanges.reset = true;
        return;
      }
      lineChanges.changes.set(id!, type === "set");
    }),
    function () {
      frameUpdater.destroy();
    }
  ];

  onDestroy(() => {
    unsubs.forEach((u) => u());
  });

  onMount(() => {
    ctx = canvas!.getContext("2d");
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
