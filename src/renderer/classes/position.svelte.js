export default class Position {
    distance = $state();
    origin = $state();
    relative = $state();
    constructor({ distance = null, origin = "start", relative = false } = {}) {
        this.distance = distance;
        this.origin = origin;
        this.relative = relative;
    }
    get styleStringWhenX() {
        if (this.origin === "center") return "";
        return (
            `${this.origin === "start" ? "left" : "right"}: ` +
            `${this.distance ?? 0}${this.relative ? "%;" : "px;"}`
        );
    }
    get styleStringWhenY() {
        if (this.origin === "center") return "";
        return (
            `${this.origin === "start" ? "top" : "bottom"}: ` +
            `${this.distance ?? 0}${this.relative ? "%;" : "px;"}`
        );
    }
    get storeData() {
        return { distance: this.distance, origin: this.origin, relative: this.relative };
    }
}
