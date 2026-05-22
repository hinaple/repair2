import { reportPluginException } from "./pluginReporter";

const listenersByChannel = new Map();

function getListeners(channel) {
    let listeners = listenersByChannel.get(channel);
    if (!listeners) {
        listeners = new Set();
        listenersByChannel.set(channel, listeners);
    }
    return listeners;
}

export function emitPluginEvent(source, channel, data, scope = "plugin") {
    if (!channel) return;

    const event = {
        channel,
        data,
        scope,
        source,
        timestamp: Date.now()
    };

    listenersByChannel.get(channel)?.forEach((listener) => {
        try {
            listener.listener(event);
        } catch (err) {
            reportPluginException(listener.source, `Event listener failed: ${channel}`, err);
        }
    });
}

export function addPluginEventListener(source, channel, listener) {
    if (!channel || typeof listener !== "function") return () => {};

    const listeners = getListeners(channel);
    const entry = { source, listener };
    listeners.add(entry);

    return () => {
        listeners.delete(entry);
        if (!listeners.size) listenersByChannel.delete(channel);
    };
}
