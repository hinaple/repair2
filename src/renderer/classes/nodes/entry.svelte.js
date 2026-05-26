import Node from "./node.svelte";
import Output from "../output";
import TypePayload from "@classes/typePayload.svelte";

const EntryTemplate = {
    startup: null,
    Communication: {
        isTypeObj: true,
        Socket: {
            isTypeObj: true,
            ondata: { channel: null, data: null },
            connect: null
        },
        serialData: { whenDataIs: null }
    },
    shortcut: {
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
        metaKey: false,
        pressingTime: 0,
        key: null
    },
    event: { channel: null }
    // keyDown: { key: null, useCapture: false }
};

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
        this.data = new TypePayload({ type: entryType, payload, template: EntryTemplate });
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
