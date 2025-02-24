export default class Position {
    constructor({ distance = null, origin = "start", relative = false } = {}) {
        this.distance = distance;
        this.origin = origin;
        this.relative = relative;
    }
}
