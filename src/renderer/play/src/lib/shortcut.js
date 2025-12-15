let shortcuts = {};
export default function initShortcuts(entryArr) {
    entryArr.forEach((e) => {
        const data = {
            ctrlKey: e.data.payload.ctrlKey,
            shiftKey: e.data.payload.shiftKey,
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

window.addEventListener(
    "keydown",
    (e) => {
        const entries = shortcuts[e.key.toUpperCase()];
        if (!entries) return;
        entries
            .filter((d) => (!d.ctrlKey || e.ctrlKey) && (!d.shiftKey || e.shiftKey))
            .forEach((d) => {
                if (!d.pressingTime) {
                    d.entry.execute();
                    return;
                }

                if (d.timeout || d.worked) return;
                d.timeout = setTimeout(() => {
                    d.timeout = null;
                    d.worked = true;
                    d.entry.execute();
                }, d.pressingTime * 1000);
            });
    },
    true
);
window.addEventListener(
    "keyup",
    (e) => {
        const entries = shortcuts[e.key.toUpperCase()];
        if (!entries) return;
        entries.forEach((d) => {
            d.worked = false;
            if (d.timeout) {
                clearTimeout(d.timeout);
                d.timeout = null;
            }
        });
    },
    true
);
