import type { FrameExport } from "@fainthit/repair2-plugin-sdk";

const mount: FrameExport = ({ attributes, ctx }, { target, children, showIntro }) => {
  const div = document.createElement("div");
  div.setAttribute("style", "background-color: #222; padding: 20px;");
  div.append(children);
  target.append(div);

  return () => {
    div.remove();
  };
};

export default mount;
