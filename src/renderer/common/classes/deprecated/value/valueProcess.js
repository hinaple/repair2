import { genId } from "@shared/genId";
import TypePayload from "../typePayload.svelte";

export default class ValueProcess extends TypePayload {
    constructor({ id = genId(), type = null, payload = {} } = {}) {
        this.id = id;
        super("valueProcess", { type, payload });
    } //need migration about id
    //#only editor
    copyData(availableOuputIds = null) {
        const sd = this.storeData;
        delete sd.id;
        return sd;
    }
    //#endonly
}
