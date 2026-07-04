import type { PluginType } from "@shared/plugin.types";

const pluginStyles = new Map();

declare global {
    var __repairPluginRuntime: {
        setStyle: typeof setStyle;
    };
}

function getRecord(pluginKey: string) {
    let record = pluginStyles.get(pluginKey);
    if (!record) {
        record = { amount: 0, style: null };
        pluginStyles.set(pluginKey, record);
    }
    return record;
}

function adjustPluginLiveCount(pluginKey: string, amount = 0) {
    const record = getRecord(pluginKey);

    const prvStatus = record.amount > 0;
    record.amount = Math.max(0, record.amount + amount);
    const currentStatus = record.amount > 0;

    if (prvStatus === currentStatus || !record.style) return;

    if (currentStatus) {
        document.head.append(record.style);
        return;
    }
    record.style.remove();
}

function setStyle(pluginKey: string, styleCode: string) {
    const record = getRecord(pluginKey);
    if (record.style?.isConnected) record.style.remove();

    const style = document.createElement("style");
    style.textContent = styleCode;
    record.style = style;

    if (record.amount > 0 && !record.style.isConnected) document.head.append(record.style);
}
globalThis.__repairPluginRuntime = { setStyle };

export function pluginAppended(type: string, pluginName: string) {
    const key = `${type}:${pluginName}`;
    adjustPluginLiveCount(key, 1);
}

export function pluginDisposed(type: string, pluginName: string) {
    const key = `${type}:${pluginName}`;
    adjustPluginLiveCount(key, -1);
}

export function setStyleForce(pluginType: PluginType, pluginName: string, cssCode: string) {
    if (pluginType !== "frame" && pluginType !== "element") return;

    const key = `${pluginType}:${pluginName}`;
    setStyle(key, cssCode);
}
