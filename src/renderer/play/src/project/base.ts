export class Base<T> {
    constructor(readonly d: T) {
        this.init();
    }
    init() {}
}
