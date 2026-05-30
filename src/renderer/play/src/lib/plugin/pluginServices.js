import { getAppData } from "../appdata";
import { reportPluginIssue } from "./pluginReporter";

const serviceProviders = new Map();

export function providePluginService(source, name, service) {
    if (!name) {
        reportPluginIssue(source, "Plugin service name is required.");
        return () => {};
    }
    if (serviceProviders.has(name)) {
        reportPluginIssue(source, `Plugin service already exists: ${name}`);
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

export function usePluginService(name, source = null) {
    const provider = serviceProviders.get(name);
    if (!provider) {
        reportPluginIssue(source, `Plugin service does not exist: ${name}`);
        return null;
    }
    return provider.service;
}

export function tryUsePluginService(name) {
    return serviceProviders.get(name)?.service ?? null;
}

export function hasPluginService(name) {
    return serviceProviders.has(name);
}
