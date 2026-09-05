import type { Attributes, ElementContext } from "@fainthit/repair2-plugin-sdk";

export type Props = {
  attributes?: Attributes;
  ctx: ElementContext;
  root: HTMLElement;
  dispatchEvent: (type: string, event?: unknown) => void;
};
