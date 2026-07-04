import { addGlobalKeyEvent } from "./globalKey";
import type { Entry } from "../project/nodes/entry";
import type { Types } from "@shared/projectData/types";
import type { GlobalKeyEvent } from "@shared/globalKeyEvent.types";

const Specials = ["ctrlKey", "shiftKey", "metaKey", "altKey"] as const;
type ShortcutData = {
    pressingTime: number;
    key: string;
    entry: Entry;
    timeout?: NodeJS.Timeout;
    worked?: boolean;
} & {
    [k in (typeof Specials)[number]]: boolean;
};
const shortcuts: Map<string, Set<ShortcutData>> = new Map();

export default function initShortcutEntries(entryArr: Entry[]) {
    shortcuts.clear();
    entryArr.forEach((e) => {
        const payload = e.d.payload as Extract<Types.Entry, { entryType: "shortcut" }>["payload"];
        if (!payload.key) return;

        const data: ShortcutData = {
            ctrlKey: payload?.ctrlKey,
            altKey: payload.altKey,
            shiftKey: payload.shiftKey,
            metaKey: payload.metaKey,
            pressingTime: payload.pressingTime ?? 0,
            key: payload.key.replace(/\s/g, "").toUpperCase(),
            entry: e
        };
        if (!data.key.length) return;

        let set: Set<ShortcutData> | undefined = shortcuts.get(data.key);
        if (!set) {
            set = new Set();
            shortcuts.set(data.key, set);
        }
        set!.add(data);
    });
}

function keydownHandler(e: GlobalKeyEvent) {
    if (!e.key) return;

    const entries = shortcuts.get(e.key.toUpperCase());
    if (!entries) return;
    entries
        .values()
        .filter((d) => Specials.every((key) => !d[key] || e[key]))
        .forEach((d) => {
            if (!d.pressingTime) {
                d.entry.enter();
                return;
            }

            if (d.timeout || d.worked) return;
            d.timeout = setTimeout(() => {
                delete d.timeout;
                d.worked = true;
                d.entry.enter();
            }, d.pressingTime * 1000);
        });
}
function keyupHandler(e: GlobalKeyEvent) {
    if (!e.key) return;

    const entries = shortcuts.get(e.key.toUpperCase());
    if (!entries) return;
    entries.forEach((d) => {
        d.worked = false;
        if (d.timeout) {
            clearTimeout(d.timeout);
            delete d.timeout;
        }
    });
}

addGlobalKeyEvent("keydown", keydownHandler);
addGlobalKeyEvent("keyup", keyupHandler);
