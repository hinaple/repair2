import { getAppData } from "./appdata";
import { registerUtils } from "./repairUtils";

const eventMap = new Map();

export function addRepairEventListener(channel, callback) {
    let channelArr = eventMap.get(channel);
    if (!channelArr) {
        channelArr = [];
        eventMap.set(channel, channelArr);
    }

    channelArr.push(callback);

    return () => {
        eventMap.set(
            channel,
            eventMap.get(channel).filter((c) => c !== callback)
        );
    };
}

export function emitRepairEvent(channel, ...data) {
    getAppData().enterEntry("event", { channel });
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
