const asyncBuffer = [];
const promiseBuffer = Array.from({ length: 5 }, () => []);
let isScheduled = false;
function requestDraw() {
    if (isScheduled) return;
    isScheduled = true;

    window.requestAnimationFrame(async () => {
        isScheduled = false;

        const reupdates = [];
        while (asyncBuffer.length) {
            const current = asyncBuffer.pop();
            if (current.callback()) reupdates.push(current);
        }
        for (const works of promiseBuffer) {
            await Promise.all(works.map((w) => w.callback()));
            works.length = 0;
        }

        reupdates.forEach((r) => r.draw());
    });
}

export default class FrameUpdater {
    constructor(callback, order = -1) {
        this.callback = callback;
        this.localBuffer = order === -1 ? asyncBuffer : promiseBuffer[order];
    }
    draw() {
        if (this.localBuffer.includes(this)) return;
        this.localBuffer.push(this);

        requestDraw();
    }
}
