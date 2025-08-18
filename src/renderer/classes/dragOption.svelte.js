import Coord from "./coord";

export default class DragOption {
    use = $state(false);

    returnOnRelease = $state(false);
    hotspots = $state([]);
    threshold = $state(0);
    snapOn = $state("never"); //never, drag, release
    moveDuration = $state(0);
    moveEasing = $state("ease");
    constructor({
        use = false,
        returnOnRelease = false,
        returnDuration = 0,
        hotspots = [],
        threshold = 0,
        snapOn = "never",
        snapDuration = 100,
        moveEasing = "easingOutSine"
    } = {}) {
        this.use = use;
        this.returnOnRelease = returnOnRelease;
        this.returnDuration = returnDuration;
        this.hotspots = hotspots.map((hs) => new Coord(hs));
        this.threshold = threshold;
        this.snapOn = snapOn;
        this.snapDuration = snapDuration;
        this.moveEasing = moveEasing;
    }
    get storeData() {
        return this.use
            ? {
                  use: this.use,
                  returnOnRelease: this.returnOnRelease,
                  returnDuration: this.returnDuration,
                  hotspots: this.hotspots.map((hs) => hs.storeData),
                  threshold: this.threshold,
                  snapOn: this.snapOn,
                  snapDuration: this.snapDuration,
                  moveEasing: this.moveEasing
              }
            : {};
    }
}
