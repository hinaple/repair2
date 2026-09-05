import type { Attributes, FrameContext } from "@fainthit/repair2-plugin-sdk";

export type Props = {
  attributes?: Attributes;
  ctx: FrameContext;
  root: HTMLElement;
  slot: (node: HTMLElement) => void;
};
