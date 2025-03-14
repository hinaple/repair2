import Output from "./output";
import TypePayload from "./typePayload.svelte";

const PayloadTemplates = {
    keyPress: { key: null },
    nothing: null,
    click: null,
    videoEnd: null
};

export default class Listener extends TypePayload {
    once = $state();
    constructor({ type = "nothing", payload = {}, output = {}, once = false } = {}) {
        super({ type, payload, template: PayloadTemplates });
        this.output = new Output(output);
        this.once = once;
        this.id = Symbol();
    }
    get storeData() {
        return { ...super.storeData, output: this.output, once: this.once };
    }
}
