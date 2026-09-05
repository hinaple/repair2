import { mount, unmount, type Component } from "svelte";
import type { FrameExport } from "@fainthit/repair2-plugin-sdk";
import type { Props } from "./props.types";

export default function createFrameExport(Comp: Component<Props>): FrameExport {
  return ({ attributes, ctx }, { target, children, showIntro }) => {
    let component: ReturnType<typeof mount> | null = mount(Comp, {
      target,
      props: {
        attributes,
        ctx,
        root: target,
        slot: (node) => node.append(children)
      },
      intro: showIntro
    });

    return () => {
      if (!component) return;
      unmount(component);
      component = null;
    };
  };
}
