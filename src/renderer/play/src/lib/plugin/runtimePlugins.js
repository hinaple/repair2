import PluginPointer from "@classes/pluginPointer.svelte";
import { createPluginContext } from "./pluginContext";
import { reportPluginException } from "./pluginReporter";
import { ipcRenderer } from "electron";
import { safeCallPlugin } from "./pluginManager";

const activeRuntimePlugins = new Map();
let activationGeneration = 0;
let currentRuntimePluginConfigs = [];

function disposeRuntimePlugin({ ctx, disposes = [], pendingRendererCalls }) {
    if (Array.isArray(pendingRendererCalls)) pendingRendererCalls.length = 0;

    try {
        disposes.forEach((dispose) => {
            if (typeof dispose === "function") dispose();
        });
    } catch (err) {
        reportPluginException(ctx.plugin, "Runtime plugin disposer failed.", err);
    }
    ctx.lifecycle.dispose();
}

function callRendererMethod(target, methodName, args) {
    if (!target || target.ctx?.lifecycle?.disposed) return;

    try {
        const result = target.plugin?.renderer?.[methodName]?.(
            ...(Array.isArray(args) ? args : [])
        );
        if (result?.then) {
            result.catch((err) =>
                reportPluginException(target.ctx.plugin, "Runtime renderer method failed.", err)
            );
        }
    } catch (err) {
        reportPluginException(target.ctx.plugin, "Runtime renderer method failed.", err);
    }
}

function flushRendererCallQueue(pluginName, target) {
    if (activeRuntimePlugins.get(pluginName) !== target || target.ctx?.lifecycle?.disposed) {
        target.pendingRendererCalls.length = 0;
        return;
    }

    const calls = target.pendingRendererCalls.splice(0);
    calls.forEach(({ methodName, args }) => {
        if (activeRuntimePlugins.get(pluginName) !== target || target.ctx?.lifecycle?.disposed)
            return;
        callRendererMethod(target, methodName, args);
    });
}

export function deactivateRuntimePlugins() {
    activeRuntimePlugins.forEach(({ ctx, disposes, pendingRendererCalls }) => {
        disposeRuntimePlugin({ ctx, disposes, pendingRendererCalls });
    });
    activeRuntimePlugins.clear();
}

async function activateRuntimePlugin(
    /** @type {PluginPointer} */
    pointer,
    generation
) {
    if (!pointer.name) return;

    let ctx = null;
    try {
        ctx = createPluginContext({
            pluginId: pointer.name,
            pluginType: "runtime"
        });
        let plugin = await pointer.use();
        if (typeof plugin === "function") plugin = await plugin(); //plugin can be a factory
        if (generation !== activationGeneration || !plugin) {
            ctx.lifecycle.dispose?.();
            return;
        }

        const call = (functionName, attributes, args) =>
            safeCallPlugin(ctx, "Plugin function execution failed.", () =>
                plugin?.[functionName]({
                    attributes,
                    ctx,
                    ...args
                })
            );

        const runtimeData = {
            call,
            plugin,
            pointer,
            ctx,
            disposes: [],
            rendererReady: false,
            pendingRendererCalls: []
        };
        activeRuntimePlugins.set(pointer.name, runtimeData);

        let main = null;
        if (pointer.getInfo()?.main) {
            const mainMethods = await ipcRenderer.invoke("plugin:runtime:activate", pointer.name, {
                rendererMethods: Object.keys(plugin?.renderer ?? {}),
                attributes: pointer.payloads
            });
            console.log("MAIN METHODS: ", mainMethods);
            if (mainMethods)
                main = Object.fromEntries(
                    mainMethods.map((methodName) => [
                        methodName,
                        (...args) =>
                            ipcRenderer.invoke("plugin:runtime:to-main", {
                                pluginName: pointer.name,
                                methodName,
                                args
                            })
                    ])
                );
        }

        if (
            generation !== activationGeneration ||
            activeRuntimePlugins.get(pointer.name) !== runtimeData
        ) {
            disposeRuntimePlugin(runtimeData);
            if (activeRuntimePlugins.get(pointer.name) === runtimeData)
                activeRuntimePlugins.delete(pointer.name);
            return;
        }

        const activeResult = await call("activate", pointer.payloads, { main });
        const tempDisposes = [typeof activeResult === "function" && activeResult, plugin?.dispose];
        if (generation !== activationGeneration) {
            disposeRuntimePlugin({
                ctx,
                disposes: tempDisposes,
                pendingRendererCalls: runtimeData.pendingRendererCalls
            });
            if (activeRuntimePlugins.get(pointer.name) === runtimeData)
                activeRuntimePlugins.delete(pointer.name);
            return;
        }
        runtimeData.disposes = tempDisposes;
        runtimeData.rendererReady = true;
        flushRendererCallQueue(pointer.name, runtimeData);
    } catch (err) {
        reportPluginException(
            ctx?.plugin ?? { id: pointer.name, type: "runtime" },
            "Runtime plugin activation failed.",
            err
        );
        ctx?.lifecycle.dispose();
        const target = activeRuntimePlugins.get(pointer.name);
        if (target?.ctx === ctx) {
            target.pendingRendererCalls.length = 0;
            activeRuntimePlugins.delete(pointer.name);
        }
    }
}

function removeDuplicatedRuntimePlugins(pointers) {
    const usedNames = [];
    return pointers.filter((pointer) => {
        if (usedNames.includes(pointer.name)) return false;
        usedNames.push(pointer.name);
        return true;
    });
}

export function activateRuntimePlugins(pointers = []) {
    console.log("RUNTIME RESET");
    currentRuntimePluginConfigs = removeDuplicatedRuntimePlugins(
        Array.isArray(pointers) ? pointers : []
    );
    activationGeneration++;
    deactivateRuntimePlugins();
    const generation = activationGeneration;

    currentRuntimePluginConfigs.forEach((pointer) => {
        activateRuntimePlugin(pointer, generation);
    });
}

export function callRuntimePluginStep(pluginName, step, payloads) {
    const targetPluginData = activeRuntimePlugins.get(pluginName);
    if (!targetPluginData?.rendererReady || !step) return;

    return targetPluginData.call(step, payloads);
}

export function restartRuntimePlugins() {
    activateRuntimePlugins(currentRuntimePluginConfigs);
}

ipcRenderer.on("plugin:runtime:to-renderer", (evt, { pluginName, methodName, args }) => {
    const target = activeRuntimePlugins.get(pluginName);
    if (!target) return;
    if (!target.rendererReady) {
        target.pendingRendererCalls.push({ methodName, args });
        return;
    }

    callRendererMethod(target, methodName, args);
});
