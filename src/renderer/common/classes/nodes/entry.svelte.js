import Node from "./node.svelte";
import Output from "../output";
import TypePayload from "../typePayload.svelte";

export default class Entry extends Node {
    standbyMode = $state(false);
    constructor(
        {
            output = {},
            entryType = "startup",
            payload = null,
            standbyMode = false,
            ...nodeData
        } = {},
        creatingOpt = null
    ) {
        super("entry", nodeData);
        this.output = new Output(output, creatingOpt);
        this.data = new TypePayload("entry", { type: entryType, payload });
        this.standbyMode = standbyMode;
        this.activated = false;
    }

    //#only play
    enter() {
        if (this.standbyMode && !this.activated) return;
        this.onEntered?.();
        this.disable();
        this.output.goto();
    }
    async execute() {
        this.activate();
    }
    disable() {
        if (!this.standbyMode && !this.activated) return;
        this.activated = false;
        this.onDisabled?.();
    }
    activate() {
        if (!this.standbyMode) return;
        this.activated = true;
        this.onActivated?.();
    }
    //#endonly

    //#only editor
    get storeData() {
        const { type: entryType, payload } = this.data.storeData;
        return {
            ...super.storeData,
            entryType,
            payload,
            output: this.output,
            standbyMode: this.standbyMode
        };
    }
    copyData(availableOuputIds = null) {
        const { type: entryType, payload } = this.data.copyData();
        return {
            ...super.copyData(),
            entryType,
            payload,
            standbyMode: this.standbyMode,
            output: this.output.copyData(availableOuputIds)
        };
    }
    //#endonly
}
