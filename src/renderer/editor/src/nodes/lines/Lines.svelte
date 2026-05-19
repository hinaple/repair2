<script>
    import { onDestroy, onMount } from "svelte";
    import * as twgl from "twgl.js";

    import { viewport, rInfo } from "../viewport";
    import { lines } from "./line";
    import FrameUpdater from "../../lib/frameUpdater";

    import VERT from "./shaders/vert.vert?raw";
    import FRAG from "./shaders/frag.frag?raw";
    import { get } from "svelte/store";
    import { makeBezierPoints } from "./getBezierPoints";

    const { unsupported } = $props();

    /** @type {HTMLCanvasElement} */
    let canvas = $state(null);
    /** @type {WebGL2RenderingContext} */
    let gl;
    let programInfo;
    let bufferInfo;
    let pointBuffer;

    let WIDTH, HEIGHT;
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
        gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: false
        });

        if (!gl) {
            console.warn(
                "Lines will be rendered with Canvas because this machine doesn't support WEBGL2."
            );
            gl = null;
            unsupported();
            return;
        }

        programInfo = twgl.createProgramInfo(gl, [VERT, FRAG]);

        setBufferInfo();
    }

    function createSampleSide(segments) {
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

    let pointsLen = 0;
    function createPointDataArr() {
        const bezierPoints = makeBezierPoints(lineArr);
        pointsLen = bezierPoints.length;

        const data = new Float32Array(bezierPoints.length * FLOATS_PER_LINE);

        bezierPoints.forEach((points, i) => {
            const o = i * FLOATS_PER_LINE;
            const p0 = points[0];
            const p1 = points[1];
            const p2 = points[2];
            const p3 = points[3];
            const p0x = p0[0];
            const p0y = p0[1];
            const p1x = p1[0];
            const p1y = p1[1];
            const p2x = p2[0];
            const p2y = p2[1];
            const p3x = p3[0];
            const p3y = p3[1];

            data[o + 0] = -p0x + 3 * p1x - 3 * p2x + p3x;
            data[o + 1] = -p0y + 3 * p1y - 3 * p2y + p3y;

            data[o + 2] = 3 * p0x - 6 * p1x + 3 * p2x;
            data[o + 3] = 3 * p0y - 6 * p1y + 3 * p2y;

            data[o + 4] = -3 * p0x + 3 * p1x;
            data[o + 5] = -3 * p0y + 3 * p1y;

            data[o + 6] = p0x;
            data[o + 7] = p0y;
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

    function updateSegmentsBuffer(gl, segmentArr) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.a_sampleSide.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, segmentArr, gl.STATIC_DRAW);
    }

    function bindVec2Instanced(program, name, offset) {
        const loc = gl.getAttribLocation(program, name);
        if (loc < 0) return;

        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, POINT_STRIDE, offset);
        gl.vertexAttribDivisor(loc, 1);
    }
    function bindPointAttributes(programInfo) {
        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);

        const program = programInfo.program;

        bindVec2Instanced(program, "a_a", 0);
        bindVec2Instanced(program, "a_b", 2 * FLOAT_SIZE);
        bindVec2Instanced(program, "a_c", 4 * FLOAT_SIZE);
        bindVec2Instanced(program, "a_d", 6 * FLOAT_SIZE);
    }

    function updateLineBuffer(gl) {
        const data = createPointDataArr();

        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    }

    let lineUpdateRequired = true;
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
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (SEGMENTS[lineSegmentIdx] + 1) * 2, pointsLen);
    }, 2);

    function setCanvas() {
        if (!canvas || !gl) return;

        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        gl.viewport(0, 0, WIDTH, HEIGHT);

        frameUpdater.draw();
    }

    let lineArr = [];
    const unsubs = [
        viewport.screen.subscribe(({ width, height }) => {
            WIDTH = width;
            HEIGHT = height;
            setCanvas();
        }),
        viewport.pos.subscribe(() => {
            changeLineSegments();
            frameUpdater.draw();
        }),
        lines.subscribe((l) => {
            lineArr = l;
            lineUpdateRequired = true;
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
