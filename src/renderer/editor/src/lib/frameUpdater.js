const asyncBuffer = [];
const promiseBuffer = Array.from({ length: 5 }, () => []);
let isScheduled = false;

let fps = 0;
let lastUpdateTs = 0;
let frameCount = 0;
function requestDraw() {
    if (isScheduled) return;
    isScheduled = true;

    window.requestAnimationFrame(async (ts) => {
        isScheduled = false;

        frameCount++;
        const elasped = ts - lastUpdateTs;

        if (elasped >= 1000) {
            fps = (frameCount * 1000) / elasped;

            console.log("FPS:", ~~(fps * 10000) / 10000);

            frameCount = 0;
            lastUpdateTs = ts;
        }

        const reupdates = [];
        while (asyncBuffer.length) {
            const current = asyncBuffer.pop();
            if (current.callback()) reupdates.push(current);
        }
        for (const works of promiseBuffer) {
            const tempWorks = works.splice(0);
            works.length = 0;
            await Promise.all(tempWorks.map((w) => w.callback()));
        }

        reupdates.forEach((r) => r.draw());
    });
}

export default class FrameUpdater {
    constructor(callback, order = -1) {
        this.callback = callback;
        this.localBuffer = order === -1 ? asyncBuffer : promiseBuffer[order];
        this.destroyed = false;
    }
    draw() {
        if (this.destroyed || this.localBuffer.includes(this)) return;
        this.localBuffer.push(this);

        requestDraw();
    }
    destroy() {
        this.destroyed = true;
    }
}
