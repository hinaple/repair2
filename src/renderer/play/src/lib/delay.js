export function delay(ms, signal) {
    if (signal.aborted) return false;
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(true);
            cleanup();
        }, ms);
        const cleanup = () => signal.removeEventListener("abort", onAbort);
        const onAbort = () => {
            clearTimeout(timeout);
            resolve(false);
            cleanup();
        };
        signal.addEventListener("abort", onAbort);
    });
}
