import { Action } from "svelte/action";
import { Logs, subscribeLog } from "../../lib/logs/logStore";
import { createLogElement } from "./logUI";

const logs: Action<HTMLElement> = (node) => {
    let scrollHeight = 0;
    let scrollBottom = 0;
    function calcScrollHeight() {
        scrollHeight = node.scrollHeight;
    }
    function calcScrollBottom() {
        scrollBottom = scrollHeight - node.scrollTop - node.clientHeight;
    }
    function scrollToBottom() {
        node.scroll({ top: scrollHeight });
    }
    const unsub = subscribeLog(({ type, entry }) => {
        calcScrollHeight();
        calcScrollBottom();
        let isBottom = scrollBottom <= 0;
        if (type === "update") node.lastElementChild?.remove();

        node.append(createLogElement(entry));
        if (!isBottom) return;
        calcScrollHeight();
        scrollToBottom();
    });

    node.append(...Logs.values().map(createLogElement));

    calcScrollHeight();
    scrollToBottom();

    return {
        destroy: unsub
    };
};

export default logs;
