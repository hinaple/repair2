import { getProject, updateData } from "./project";
import { afterPluginImported } from "./lib/plugin/pluginManager";
import { ipc } from "./lib/ipc";
import "./lib/communication";
import "./lib/editorOpen";
import "./lib/store";
import "./lib/preview";
import "./webcomponents/repairAsset";

import type { Entry } from "./project/nodes/entry";

window.addEventListener("load", () => {
    afterPluginImported().then(() => {
        const p = updateData();
        ipc.send("play-win-ready");
        p.enterEntries("startup");
    });
});

ipc.on("request-execute", (event, { type, id }) => {
    const node = getProject().nodes.get(id);
    if (!node) return;

    if (type === "entry" && node.d.type === "entry") (node as Entry).enter();
    else node.execute();
});
