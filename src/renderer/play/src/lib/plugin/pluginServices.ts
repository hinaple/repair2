import { getProject } from "../../project";
import { reportPluginWarning } from "./pluginReporter";
import type { PluginIdentity } from "@fainthit/repair2-plugin-sdk";

const serviceProviders: Map<string, { source: PluginIdentity; service: unknown }> = new Map();

export function providePluginService(source: PluginIdentity, name: string, service: unknown) {
    if (!name) {
        reportPluginWarning(source, "Plugin service name is required.");
        return () => {};
    }
    if (serviceProviders.has(name)) {
        reportPluginWarning(source, `Plugin service already exists: ${name}`);
        return () => {};
    }

    serviceProviders.set(name, { source, service });

    return () => {
        const provider = serviceProviders.get(name);
        if (provider?.source?.instanceId === source.instanceId) {
            serviceProviders.delete(name);
        }
    };
}

export function usePluginService(name: string, source: PluginIdentity): unknown | null {
    const provider = serviceProviders.get(name);
    if (!provider) {
        reportPluginWarning(source, `Plugin service does not exist: ${name}`);
        return null;
    }
    return provider.service;
}

export function tryUsePluginService(name: string): unknown | null {
    return serviceProviders.get(name)?.service ?? null;
}

export function hasPluginService(name: string) {
    return serviceProviders.has(name);
}
