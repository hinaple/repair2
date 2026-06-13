import koffi from "koffi";

const user32 = koffi.load("user32.dll");

const LockSetForegroundWindow = user32.func(
    "bool __stdcall LockSetForegroundWindow(uint uLockCode)"
);

const LSFW_LOCK = 1;
const LSFW_UNLOCK = 2;

export function lockForegroundChange() {
    if (process.platform !== "win32") return false;
    return LockSetForegroundWindow(LSFW_LOCK);
}

export function unlockForegroundChange() {
    if (process.platform !== "win32") return false;
    return LockSetForegroundWindow(LSFW_UNLOCK);
}
