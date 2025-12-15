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
import { clearDelays, delay } from "./delay";
import { ipcRenderer } from "electron";

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
                socketSend(s.payload.channel, s.payload.data);
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

    delay: (s) => delay(s.payload.delayMs),
    Others: {
        customReset: (s) => {
            if (s.payload.audios) resetAudio();
            if (s.payload.variables) resetAllVar();
            if (s.payload.components) clearComponents(true);
            if (s.payload.delays) clearDelays();
            if (s.payload.preloads) removePreloadsAll();
        },
        setVariable: (s) => setVar(s.payload.variableId, s.payload.value),
        resetAllVariables: () => resetAllVar(),
        executePlugin: (s) => {
            return new Promise((res) => {
                s.payload.plugin
                    .use()
                    .then((func) => func?.())
                    .then(() => {
                        if (s.payload.waitTillEnd) res();
                    });
                if (!s.payload.waitTillEnd) res();
            });
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
            ipcRenderer.send("custom-log", s.payload.content);
            console.log(
                `%cLOG%c${(s.payload.content.includes("\n") ? "\n" : "") + s.payload.content}`,
                "font-family: system-ui; color: #fff; font-weight: bold;" +
                    "display: inline-block; background-color: #140959; padding: 3px 15px; border-radius: 3px; margin-right: 5px;",
                ""
            );
        }
    }
};

export default function stepExecute(step) {
    const action = step.types.reduce((acc, type) => acc[type], actions);
    if (action) return action(step);

    return null;
}
