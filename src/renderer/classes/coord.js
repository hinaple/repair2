import Position from "./position";

export default class Coord {
    constructor({ x = {}, y = {} } = {}) {
        this.x = new Position(x);
        this.y = new Position(y);
    }
}
