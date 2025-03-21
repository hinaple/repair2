import { addPreloadsBulk } from "./resources";
import { setVar } from "./variables";
import { addComponent, clearComponents, removeComponent } from "./components";

const actions = {
    Component: {
        create: (s) => addComponent(s.payload),
        remove: (s) => removeComponent(s.payload.componentAlias, s.payload.ignoreUnbreakable),
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
        release: (s) => {},
        releaseAll: (s) => {}
    },

    delay: (s) => new Promise((res) => setTimeout(res, s.payload.delayMs)),
    setVariable: (s) => setVar(s.payload.variableId, s.payload.value),
    executePlugin: (s) => {
        const plugin = s.payload.use();
        if (plugin === "importing") s.payload.promise.then(() => s.payload.use()?.());
        else plugin?.();
    }
};

export default function stepExecute(step) {
    const action = step.types.reduce((acc, type) => acc[type], actions);
    if (action) return action(step);

    return null;
}
