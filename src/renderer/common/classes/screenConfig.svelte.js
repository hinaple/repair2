import TypePayload from "./typePayload.svelte";

const ScreenConfigTypes = {
    fullscreen: null,
    fullMultiScreen: null,
    windowMode: {
        // width: null,
        // height: null,
        x: 0,
        y: 0
    }
};

export default class ScreenConfig extends TypePayload {
    constructor({ type = "fullscreen", payload = {} }) {
        super({ type, payload, template: ScreenConfigTypes });
    }
}
