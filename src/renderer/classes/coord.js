import Position from "./position.svelte";

export default class Coord {
    constructor({ x = {}, y = {} } = {}) {
        this.x = new Position(x);
        this.y = new Position(y);
    }
    //#only play
    get styleString() {
        return `${this.x.styleStringWhenX} ${this.y.styleStringWhenY}`;
    }
    //#endonly
    get storeData() {
        return { x: this.x.storeData, y: this.y.storeData };
    }
}
