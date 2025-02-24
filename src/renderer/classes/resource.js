import { genId } from "./utils";

export default class Resource {
    constructor({ id = genId(), src = null, alias = null } = {}) {}
}
