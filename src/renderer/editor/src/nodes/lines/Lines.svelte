<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";
  import * as twgl from "twgl.js";
  import { viewport, rInfo } from "../viewport";
  import { getLines, subscribeLines, type Output } from "./output";
  import FrameUpdater from "../../lib/frameUpdater";
  import { makeBezierPoint } from "./getBezierPoints";

  import VERT from "./shaders/vert.vert?raw";
  import FRAG from "./shaders/frag.frag?raw";

  const { unsupported }: { unsupported: () => unknown } = $props();

  let canvas: HTMLCanvasElement | null = $state(null);
  let gl: WebGL2RenderingContext;
  let programInfo: twgl.ProgramInfo;
  let bufferInfo: twgl.BufferInfo;
  let pointBuffer: WebGLBuffer;

  let WIDTH: number, HEIGHT: number, PW: number, PH: number;
  const FLOAT_SIZE = 4;
  const POINTS_PER_LINE = 4;
  const COMPONENTS_PER_POINT = 2;
  const FLOATS_PER_LINE = POINTS_PER_LINE * COMPONENTS_PER_POINT;
  const POINT_STRIDE = FLOATS_PER_LINE * FLOAT_SIZE;

  const SEGMENT_STEPS = [0.3, 0.7];
  const SEGMENTS = [12, 24, 40];

  let lineSegmentIdx = 0;
  function changeLineSegments() {
    const idx = SEGMENT_STEPS.findIndex((step) => rInfo.ratio < step);
    let tempIdx = idx === -1 ? SEGMENT_STEPS.length : idx;

    if (tempIdx === lineSegmentIdx) return;
    lineSegmentIdx = tempIdx;

    if (gl) updateSegmentsBuffer(gl, SampleSides[lineSegmentIdx]);
  }

  function initWebGL() {
    if (!canvas) return;

    const tempGl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false
    });

    if (!tempGl) {
      console.warn(
        "Lines will be rendered with Canvas because this machine doesn't support WEBGL2."
      );
      unsupported();
      return;
    }
    gl = tempGl;

    programInfo = twgl.createProgramInfo(gl, [VERT, FRAG]);

    setBufferInfo();
  }

  function createSampleSide(segments: number) {
    const sampleSide = new Int8Array((segments + 1) * 2 * 2);

    for (let i = 0; i <= segments; i++) {
      const o = i * 4;

      sampleSide[o + 0] = i;
      sampleSide[o + 1] = -1;

      sampleSide[o + 2] = i;
      sampleSide[o + 3] = +1;
    }

    return sampleSide;
  }
  const SampleSides = SEGMENTS.map((s) => createSampleSide(s));

  const bezierPoints: Map<string, number[]> = new Map();
  const lineChanges = {
    reset: false,
    changes: new Map<string, boolean>() //true: set, false: remove
  };
  function getCurveData(l: Output) {
    const b = makeBezierPoint(l);
    const data = new Array(b.length);
    const lineCount = b.length / FLOATS_PER_LINE;
    for (let i = 0; i < lineCount; i++) {
      const o = FLOATS_PER_LINE * i;
      const p0x = b[o + 0];
      const p0y = b[o + 1];
      const p1x = b[o + 2];
      const p1y = b[o + 3];
      const p2x = b[o + 4];
      const p2y = b[o + 5];
      const p3x = b[o + 6];
      const p3y = b[o + 7];

      data[o + 0] = -p0x + 3 * p1x - 3 * p2x + p3x;
      data[o + 1] = -p0y + 3 * p1y - 3 * p2y + p3y;

      data[o + 2] = 3 * p0x - 6 * p1x + 3 * p2x;
      data[o + 3] = 3 * p0y - 6 * p1y + 3 * p2y;

      data[o + 4] = -3 * p0x + 3 * p1x;
      data[o + 5] = -3 * p0y + 3 * p1y;

      data[o + 6] = p0x;
      data[o + 7] = p0y;
    }

    return data;
  }
  let pointsLen = 0;
  function createPointDataArr() {
    const lines = getLines();
    if (lineChanges.reset) {
      bezierPoints.clear();
      pointsLen = 0;
      lines.forEach((l, id) => {
        const c = getCurveData(l);
        pointsLen += c.length;
        bezierPoints.set(id, c);
      });
      lineChanges.reset = false;
    } else {
      lineChanges.changes.forEach((isSet, id) => {
        if (!isSet) {
          bezierPoints.delete(id);
          return;
        }
        const l = lines.get(id);
        l && bezierPoints.set(id, getCurveData(l));
      });
      pointsLen = bezierPoints.values().reduce((v, a) => v + a.length, 0);
    }

    lineChanges.changes.clear();

    const data = new Float32Array(pointsLen);
    let o = 0;
    bezierPoints.forEach((p) => {
      data.set(p, o);
      o += p.length;
    });

    return data;
  }

  function setBufferInfo() {
    bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      a_sampleSide: {
        numComponents: 2,
        data: SampleSides[lineSegmentIdx],
        type: gl.BYTE,
        normalize: false
      }
    });

    pointBuffer = gl.createBuffer();
    updateLineBuffer(gl);
  }

  function updateSegmentsBuffer(gl: WebGL2RenderingContext, segmentArr: Int8Array<ArrayBuffer>) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo!.attribs!.a_sampleSide.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, segmentArr, gl.STATIC_DRAW);
  }

  function bindVec2Instanced(
    program: WebGLProgram,
    name: `a_${"a" | "b" | "c" | "d"}`,
    offset: number
  ) {
    const loc = gl.getAttribLocation(program, name);
    if (loc < 0) return;

    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, POINT_STRIDE, offset);
    gl.vertexAttribDivisor(loc, 1);
  }
  function bindPointAttributes(programInfo: twgl.ProgramInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);

    const program = programInfo.program;

    bindVec2Instanced(program, "a_a", 0);
    bindVec2Instanced(program, "a_b", 2 * FLOAT_SIZE);
    bindVec2Instanced(program, "a_c", 4 * FLOAT_SIZE);
    bindVec2Instanced(program, "a_d", 6 * FLOAT_SIZE);
  }

  function updateLineBuffer(gl: WebGL2RenderingContext) {
    const data = createPointDataArr();
    if (!data) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  }

  let lineUpdateRequired = false;
  const frameUpdater = new FrameUpdater(async () => {
    if (!gl) return;

    gl.useProgram(programInfo.program);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (lineUpdateRequired) {
      updateLineBuffer(gl);
      lineUpdateRequired = false;
    }
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    bindPointAttributes(programInfo);

    const vpPos = get(viewport.pos);
    const uniforms = {
      u_resolution: [WIDTH, HEIGHT],
      u_viewportPos: [vpPos.x, vpPos.y],
      u_ratio: rInfo.ratio,
      u_lineWidth: (1.5 * rInfo.ratio) / rInfo.ratio,
      u_segments: SEGMENTS[lineSegmentIdx]
    };

    twgl.setUniforms(programInfo, uniforms);
    gl.drawArraysInstanced(
      gl.TRIANGLE_STRIP,
      0,
      (SEGMENTS[lineSegmentIdx] + 1) * 2,
      pointsLen / FLOATS_PER_LINE
    );
  }, 2);

  function setCanvas() {
    if (!canvas || !gl) return;

    canvas.width = PW;
    canvas.height = PH;
    gl.viewport(0, 0, PW, PH);

    frameUpdater.draw();
  }

  const unsubs = [
    viewport.screen.subscribe(({ width, height, pixelWidth, pixelHeight }) => {
      if (!width || !height) return;

      WIDTH = width;
      HEIGHT = height;
      PW = pixelWidth;
      PH = pixelHeight;
      changeLineSegments();
      setCanvas();
    }),
    viewport.pos.subscribe(() => {
      changeLineSegments();
      frameUpdater.draw();
    }),
    subscribeLines((type, id) => {
      if (lineChanges.reset) return;

      lineUpdateRequired = true;
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
    initWebGL();
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
