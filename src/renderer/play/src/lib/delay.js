const delays = new Map();

export function delay(ms) {
    return new Promise((resolve) => {
        let s = Symbol();
        delays.set(s, {
            resolve,
            timeout: setTimeout(() => {
                delays.delete(s);
                resolve(true);
            }, ms)
        });
    });
}

export function clearDelays() {
    delays.forEach(({ timeout, resolve }) => {
        clearTimeout(timeout);
        resolve(false);
    });
    delays.clear();
}
