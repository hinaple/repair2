import { Action } from "svelte/action";
import { Logs, subscribeLog } from "../../lib/logs/logStore";
import { createLogElement } from "./logUI";

const logs: Action<HTMLElement> = (node) => {
    const unsub = subscribeLog(({ type, entry }) => {
        if (type === "update") node.lastElementChild?.remove();

        node.append(createLogElement(entry));
    });

    node.append(...Logs.values().map(createLogElement));

    return {
        destroy: unsub
    };
};

export default logs;
