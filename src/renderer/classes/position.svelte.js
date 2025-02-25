export default class Position {
    distance = $state();
    origin = $state();
    relative = $state();
    constructor({ distance = null, origin = "start", relative = false } = {}) {
        this.distance = distance;
        this.origin = origin;
        this.relative = relative;
    }
    get storeData() {
        return { distance: this.distance, origin: this.origin, relative: this.relative };
    }
}
