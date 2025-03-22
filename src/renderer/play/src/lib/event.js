import { getAppData } from "./appdata";
import { registerUtils } from "./globalUtils";

const eventMap = {};

export function addRepairEventListener(channel, callback) {
    if (eventMap[channel]) eventMap[channel] = [];

    eventMap[channel].push(callback);

    return () => {
        eventMap[channel] = eventMap[channel].filter((c) => c !== callback);
    };
}

export function emitRepairEvent(channel, data) {
    getAppData().executeEntry("event", { channel });
    if (!eventMap[channel]) return;
    eventMap[channel].forEach((callback) => callback(data));
}

registerUtils("event", {
    addListener(channel, callback) {
        return addRepairEventListener(channel, callback);
    },
    emit(channel, data) {
        return emitRepairEvent(channel, data);
    }
});
