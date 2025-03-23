import { addPreloadsBulk, removePreload, removePreloadsAll, removePreloadsBulk } from "./resources";
import { setVar } from "./variables";
import { addComponent, clearComponents, removeComponentByAlias } from "./components";
import { packageLoader } from "../lib/plugin-package-loader.js";
import {
    serialOpen,
    serialSend,
    serialClose,
    socketConnect,
    socketSend,
    socketDisconnect
} from "./communication";
import { emitRepairEvent } from "./event";

const actions = {
    Component: {
        create: (s) => addComponent(s.payload),
        remove: (s) =>
            removeComponentByAlias(s.payload.componentAlias, s.payload.ignoreUnbreakable),
        clear: (s) => clearComponents(s.payload.ignoreUnbreakable),
        modify: (s) => {}
    },
    Audio: {
        play: (s) => {},
        pause: (s) => {},
        resume: (s) => {},
        changeVolume: (s) => {}
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

    delay: (s) => new Promise((res) => setTimeout(res, s.payload.delayMs)),
    Others: {
        setVariable: (s) => setVar(s.payload.variableId, s.payload.value),
        executePlugin: (s) => {
            s.payload.use(packageLoader).then((func) => func?.());
        },
        eventEmit: (s) => {
            if (s.payload.channel) emitRepairEvent(s.payload.channel, s.payload.data);
        }
    }
};

export default function stepExecute(step) {
    const action = step.types.reduce((acc, type) => acc[type], actions);
    if (action) return action(step);

    return null;
}
