import TypePayload from "./typePayload.svelte";

export default class ScreenConfig extends TypePayload {
    constructor({ type = "fullscreen", payload = {} }) {
        super("screenConfig", { type, payload });
    }
}
