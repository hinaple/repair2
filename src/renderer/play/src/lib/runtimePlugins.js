import { createPluginContext } from "./pluginContext";
import { reportPluginException } from "./pluginReporter";

const activeRuntimePlugins = new Map();
let activationGeneration = 0;
let currentRuntimePluginConfigs = [];

function disposeRuntimePlugin({ ctx, dispose }) {
    try {
        dispose?.();
    } catch (err) {
        reportPluginException(ctx.plugin, "Runtime plugin disposer failed.", err);
    }
    ctx.lifecycle.dispose();
}

export function deactivateRuntimePlugins() {
    activeRuntimePlugins.forEach(({ ctx, dispose }) => {
        disposeRuntimePlugin({ ctx, dispose });
    });
    activeRuntimePlugins.clear();
}

async function activateRuntimePlugin(pointer, generation) {
    if (!pointer.name) return;

    let ctx = null;
    try {
        ctx = createPluginContext({
            pluginId: pointer.name,
            pluginType: "runtime"
        });
        const activate = await pointer.use(null, {}, ctx, "activate");
        if (generation !== activationGeneration) {
            ctx.lifecycle.dispose?.();
            return;
        }

        const dispose = await activate();
        if (generation !== activationGeneration) {
            disposeRuntimePlugin({
                ctx,
                dispose: typeof dispose === "function" ? dispose : null
            });
            return;
        }
        activeRuntimePlugins.set(pointer.name, {
            pointer,
            ctx,
            dispose: typeof dispose === "function" ? dispose : null
        });
    } catch (err) {
        reportPluginException(
            ctx?.plugin ?? { id: pointer.name, type: "runtime" },
            "Runtime plugin activation failed.",
            err
        );
        ctx?.lifecycle.dispose();
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

export async function callRuntimePluginStep(pluginName, step, payloads) {
    const targetPluginData = activeRuntimePlugins.get(pluginName);
    if (!targetPluginData || !step) return;

    const fn = await targetPluginData.pointer.use(null, {}, targetPluginData.ctx, step, payloads);
    return await fn();
}

export function restartRuntimePlugins() {
    activateRuntimePlugins(currentRuntimePluginConfigs);
}
