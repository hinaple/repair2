import { getProject } from "../project";
import { registerUtils } from "./repairUtils";

type Callback = (...data: any[]) => void;
const eventMap: Map<string, Set<Callback>> = new Map();

export function addRepairEventListener(channel: string, callback: Callback) {
    let channelSet = eventMap.get(channel);
    if (!channelSet) {
        channelSet = new Set();
        eventMap.set(channel, channelSet);
    }

    channelSet.add(callback);

    return () => channelSet.delete(callback);
}

export function emitRepairEvent(channel: string, ...data: any[]) {
    getProject().enterEntries("event", { channel });
    const channelArr = eventMap.get(channel);
    if (!channelArr) return;
    channelArr.forEach((callback) => callback(...data));
}

registerUtils("event", {
    addListener(channel, callback) {
        return addRepairEventListener(channel, callback);
    },
    emit(channel, data) {
        return emitRepairEvent(channel, data);
    }
});
