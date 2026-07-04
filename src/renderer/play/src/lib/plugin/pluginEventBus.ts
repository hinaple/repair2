import { reportPluginException } from "./pluginReporter";
import type { EventScope, PluginEvent, PluginIdentity } from "@fainthit/repair2-plugin-sdk";

interface PluginListenerEntry<TData = unknown> {
    source: PluginIdentity;
    listener(event: PluginEvent<TData>): void;
}
const listenersByChannel: Map<string, Set<PluginListenerEntry>> = new Map();

function getListeners(channel: string) {
    let listeners = listenersByChannel.get(channel);
    if (!listeners) {
        listeners = new Set();
        listenersByChannel.set(channel, listeners);
    }
    return listeners;
}

export function emitPluginEvent<TData = unknown>(
    source: PluginIdentity,
    channel: string,
    data: TData,
    scope: EventScope = "plugin"
) {
    if (!channel) return;

    const event: PluginEvent = {
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

export function addPluginEventListener<TData = unknown>(
    source: PluginIdentity,
    channel: string,
    listener: (event: PluginEvent<TData>) => void
) {
    if (!channel || typeof listener !== "function") return () => {};

    const listeners = getListeners(channel);
    const entry: PluginListenerEntry<TData> = { source, listener };
    listeners.add(entry);

    return () => {
        listeners.delete(entry);
        if (!listeners.size) listenersByChannel.delete(channel);
    };
}
