export default class Output {
    constructor({ to = null } = {}, creatingOpt = null) {
        if (creatingOpt?.nodeIds && typeof to === "number" && to >= 0) to = creatingOpt.nodeIds[to];
        this.to = to ?? null;
    }
    copyData(availableOuputIds = null) {
        if (!availableOuputIds) return undefined;
        const toIdx = availableOuputIds.indexOf(this.to);
        if (toIdx >= 0) return { to: toIdx };
        return undefined;
    }
}
