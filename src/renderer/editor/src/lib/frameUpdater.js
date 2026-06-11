const asyncBuffer = [];
const promiseBuffer = Array.from({ length: 5 }, () => []);
let isScheduled = false;

function requestDraw() {
    if (isScheduled) return;
    isScheduled = true;

    window.requestAnimationFrame(async (ts) => {
        isScheduled = false;

        const reupdates = [];
        while (asyncBuffer.length) {
            const current = asyncBuffer.pop();
            if (current.callback(ts)) reupdates.push(current);
        }
        for (const works of promiseBuffer) {
            const tempWorks = works.splice(0);
            works.length = 0;
            await Promise.all(tempWorks.map((w) => w.callback(ts)));
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
