const asyncBuffer: FrameUpdater[] = [];
const promiseBuffer: FrameUpdater[][] = Array.from({ length: 5 }, () => []);
let isScheduled = false;

function requestDraw() {
  if (isScheduled) return;
  isScheduled = true;

  window.requestAnimationFrame(async (ts) => {
    isScheduled = false;

    const reupdates = [];
    while (asyncBuffer.length) {
      const current = asyncBuffer.pop();
      if (current && !current.destroyed && current.callback(ts)) reupdates.push(current);
    }
    for (const works of promiseBuffer) {
      const tempWorks = works.splice(0);
      works.length = 0;
      await Promise.all(tempWorks.filter((w) => !w.destroyed).map((w) => w.callback(ts)));
    }

    reupdates.forEach((r) => r.draw());
  });
}

export default class FrameUpdater {
  private localBuffer: FrameUpdater[];
  destroyed = false;
  constructor(
    public callback: (ts: number) => unknown,
    order: number = -1
  ) {
    this.localBuffer = order === -1 ? asyncBuffer : promiseBuffer[order];
  }
  draw() {
    if (this.destroyed || this.localBuffer.includes(this)) return;
    this.localBuffer.push(this);

    requestDraw();
  }
  destroy() {
    this.destroyed = true;
    const index = this.localBuffer.indexOf(this);
    if (index !== -1) this.localBuffer.splice(index, 1);
  }
}
