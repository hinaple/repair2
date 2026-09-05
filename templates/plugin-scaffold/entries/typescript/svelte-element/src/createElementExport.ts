import { mount, unmount, type Component } from "svelte";
import type { ElementExport } from "@fainthit/repair2-plugin-sdk";
import type { Props } from "./props.types";

export default function createElementExport(Comp: Component<Props>): ElementExport {
  return ({ attributes, ctx }, { target, dispatchEvent }) => {
    let component: ReturnType<typeof mount> | null = mount(Comp, {
      target,
      props: {
        attributes,
        ctx,
        dispatchEvent,
        root: target
      }
    });

    return () => {
      if (!component) return;
      unmount(component);
      component = null;
    };
  };
}
