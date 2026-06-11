import { ipc } from "./ipc";

let shortcuts = {};
export default function initShortcuts(entryArr) {
    shortcuts = {};
    entryArr.forEach((e) => {
        const data = {
            ctrlKey: e.data.payload.ctrlKey,
            altKey: e.data.payload.altKey,
            shiftKey: e.data.payload.shiftKey,
            metaKey: e.data.payload.metaKey,
            pressingTime: e.data.payload.pressingTime,
            key: e.data.payload.key,
            entry: e
        };
        if (!data.key) return;
        data.key = data.key.replace(/\s/g, "").toUpperCase();
        if (!data.key.length) return;

        if (!shortcuts[data.key]) shortcuts[data.key] = [];
        shortcuts[data.key].push(data);
    });
}

ipc.on("global-key-event", (_, type, evt) => {
    if (type === "keydown") keydownHandler(evt);
    else if (type === "keyup") keyupHandler(evt);
});

const Specials = ["ctrlKey", "shiftKey", "metaKey", "altKey"];
function keydownHandler(e) {
    if (!e.key) return;

    const entries = shortcuts[e.key.toUpperCase()];
    if (!entries) return;
    entries
        .filter((d) => Specials.every((key) => !d[key] || e[key]))
        .forEach((d) => {
            if (!d.pressingTime) {
                d.entry.enter();
                return;
            }

            if (d.timeout || d.worked) return;
            d.timeout = setTimeout(() => {
                d.timeout = null;
                d.worked = true;
                d.entry.enter();
            }, d.pressingTime * 1000);
        });
}
function keyupHandler(e) {
    if (!e.key) return;

    const entries = shortcuts[e.key.toUpperCase()];
    if (!entries) return;
    entries.forEach((d) => {
        d.worked = false;
        if (d.timeout) {
            clearTimeout(d.timeout);
            d.timeout = null;
        }
    });
}
