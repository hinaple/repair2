import { getProject, updateData } from "./project";
import { afterPluginImported } from "./lib/plugin/pluginManager";
import { ipc } from "./lib/ipc";
import "./lib/communication";
import "./lib/editorOpen";
import "./lib/store";
import "./lib/preview";
import "./webcomponents/repairAsset";

import type { Entry } from "./project/nodes/entry";
import { editor } from "./lib/msg";

window.addEventListener("load", () => {
  afterPluginImported().then(() => {
    const p = updateData();
    ipc.send("play-win-ready");
    p.enterEntries("startup");
  });
});

editor.on("execute:request", ({ type, id }) => {
  const node = getProject().nodes.get(id);
  if (!node) return;

  if (type === "entry" && node.d.nodeType === "entry") (node as Entry).enter();
  else node.execute();
});
