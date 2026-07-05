import type { Action } from "svelte/action";

type EventOption = boolean | AddEventListenerOptions;

type EventParams = {
  [K in keyof HTMLElementEventMap]: [
    type: K,
    callback: (event: HTMLElementEventMap[K]) => void,
    option?: EventOption
  ];
}[keyof HTMLElementEventMap];

const event: Action<HTMLElement, EventParams> = (node, [type, callback, option]) => {
  node.addEventListener(type, callback as EventListener, option);

  return {
    destroy() {
      node.removeEventListener(type, callback as EventListener, option);
    }
  };
};

export default event;
