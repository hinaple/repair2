export function defineRuntimePlugin(plugin) {
    assertObject(plugin, "Runtime plugin");
    if (typeof plugin.activate !== "function") {
        throw new TypeError("Runtime plugin activate must be a function.");
    }
    return plugin;
}

export function defineElementPlugin(pluginClass) {
    assertConstructor(pluginClass, "Element plugin");
    return pluginClass;
}

export function defineFramePlugin(pluginClass) {
    assertConstructor(pluginClass, "Frame plugin");
    return pluginClass;
}

export function defineFunctionPlugin(plugin) {
    assertObject(plugin, "Function plugin");
    return plugin;
}

export function defineTransitionPlugin(plugin) {
    if (Array.isArray(plugin)) return { keyframes: plugin };
    assertObject(plugin, "Transition plugin");
    return plugin;
}

function assertObject(value, label) {
    if (value && typeof value === "object") return;
    throw new TypeError(`${label} must be an object.`);
}

function assertConstructor(value, label) {
    if (typeof value === "function") return;
    throw new TypeError(`${label} must be a constructor.`);
}
