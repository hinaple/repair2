import Position from "./position.svelte";

export default class Coord {
    constructor({ x = {}, y = {} } = {}) {
        this.x = new Position(x);
        this.y = new Position(y);
    }
    get styleString() {
        return `${this.x.styleStringWhenX} ${this.y.styleStringWhenY}`;
    }
    get storeData() {
        return { x: this.x.storeData, y: this.y.storeData };
    }
}
