import { Action } from "svelte/action";
import { Logs, subscribeLog } from "../../lib/logs/logStore";
import { createLogElement } from "./logLine";

const logs: Action<HTMLElement> = (node) => {
    const unsub = subscribeLog(({ type, entry }) => {
        console.log(type, entry);
        if (type === "update") node.lastElementChild?.remove();

        node.append(createLogElement(entry));
    });

    console.log(...Logs.values().map((v) => v.content));
    node.append(...Logs.values().map(createLogElement));

    return {
        destroy: unsub
    };
};

export default logs;
