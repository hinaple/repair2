import { addPreloadsBulk, removePreloadsAll, removePreloadsBulk } from "./resources";
import { setVar, resetAllVar } from "./variables";
import {
    addComponent,
    clearComponents,
    modifyComponentByAlias,
    removeComponentByAlias
} from "./components";
import {
    serialOpen,
    serialSend,
    serialClose,
    socketConnect,
    socketSend,
    socketDisconnect,
    socketConnectService
} from "./communication";
import { emitRepairEvent } from "./event";
import { playAudio, pauseAudio, resumeAudio, changeAudioVolume, resetAudio } from "./audio";
import { delay } from "./delay";
import { getAppData } from "./appdata";
import { sendChanges, sendTotalInfo } from "./runtimeMonitor";
import { callRuntimePluginStep, restartRuntimePlugins } from "./plugin/runtimePlugins";
import { customLog } from "./logger";
import { callFunctionPlugin } from "./plugin/pluginManager";
import { ipc } from "./ipc";

let resetAbort = new AbortController();

const actions = {
    Component: {
        create: (s) => addComponent(s.payload),
        remove: (s) =>
            removeComponentByAlias(s.payload.componentAlias, s.payload.ignoreUnbreakable),
        clear: (s) => clearComponents(s.payload.ignoreUnbreakable),
        modify: (s) => {
            modifyComponentByAlias(
                s.payload.componentAlias,
                s.payload.modifyKey,
                s.payload.modifyValue
            );
        }
    },
    Audio: {
        play: (s) =>
            playAudio(s.payload.channel, s.payload.resourceId, s.payload.volume, s.payload.loop),
        pause: (s) => pauseAudio(s.payload.channel),
        resume: (s) => resumeAudio(s.payload.channel),
        changeVolume: (s) =>
            changeAudioVolume(s.payload.channel, s.payload.volume, s.payload.duration),
        reset: () => resetAudio()
    },
    Preload: {
        add: (s) => addPreloadsBulk(s.payload.resourceArr),
        release: (s) => removePreloadsBulk(s.payload.resourceArr),
        releaseAll: () => removePreloadsAll()
    },
    Communication: {
        Socket: {
            connect: (s) => {
                socketConnect(s.payload.url);
            },
            connectService: (s) => {
                socketConnectService(s.payload.type, s.payload.name);
            },
            send: (s) => {
                socketSend(
                    s.payload.channel,
                    ...(Array.isArray(s.payload.data) || !s.payload.splitStr
                        ? s.payload.data
                        : s.payload.data.split(s.payload.splitStr))
                );
            },
            disconnect: () => {
                socketDisconnect();
            }
        },
        Serial: {
            open: (s) => {
                serialOpen(s.payload.portAlias, s.payload.port, s.payload.baudRate);
            },
            send: (s) => {
                serialSend(s.payload.data);
            },
            close: () => {
                serialClose();
            }
        }
    },

    delay: (s) => delay(s.payload.delayMs, resetAbort.signal),
    Others: {
        customReset: (s) => {
            if (s.payload.audios) resetAudio();
            if (s.payload.variables) resetAllVar();
            if (s.payload.components) clearComponents(true);
            if (s.payload.steps) clearWaitingSteps();
            if (s.payload.preloads) removePreloadsAll();
            if (s.payload.entries) getAppData().resetEntries();
            if (s.payload.runtimePlugins) restartRuntimePlugins();

            sendTotalInfo();
        },
        setVariable: (s) => setVar(s.payload.variableId, s.payload.value),
        resetAllVariables: () => resetAllVar(),
        executePlugin: (s) => {
            const prom = callFunctionPlugin({
                name: s.payload.plugin.name,
                exportName: s.payload.plugin.exportName,
                argument: { attributes: s.payload.plugin.payloads, signal: resetAbort.signal }
            });
            return s.payload.waitTillEnd ? prom : true;
        },
        runtimePluginStep: (s) => {
            const prom = callRuntimePluginStep(
                s.payload.pluginName,
                s.payload.step,
                s.payload.payloads
            );
            return s.payload.waitTillEnd ? prom : true;
        },
        eventEmit: (s) => {
            if (s.payload.channel) emitRepairEvent(s.payload.channel, s.payload.data);
        },
        script: (s) => {
            try {
                new Function(s.payload.code)();
            } catch (err) {
                console.error(err);
            }
        },
        log: (s) => {
            ipc.send("custom-log", s.payload.content);
            customLog(s.payload.content);
        }
    }
};

export const WaitingSteps = new Map();

export function stepExecute(step) {
    const action = step.types.reduce((acc, type) => acc[type], actions);
    if (!action) return null;

    let actionResult = action(step);
    if (!actionResult?.then) {
        sendChanges("step", "executed", step.id);
        return actionResult;
    }

    return new Promise((resolve) => {
        sendChanges("step", "started", step.id);
        const s = Symbol();
        WaitingSteps.set(s, {
            resolve,
            id: step.id
        });
        actionResult.then((result) => {
            const data = WaitingSteps.get(s);
            if (!data) return;
            data.resolve(result);
            sendChanges("step", "ended", data.id);
            WaitingSteps.delete(s);
        });
    });
}

export function clearWaitingSteps() {
    WaitingSteps.forEach(({ resolve }) => resolve(false));
    WaitingSteps.clear();
    resetAbort.abort();
    resetAbort = new AbortController();
}
