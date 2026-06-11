import type { MainEditorSave, MainState } from "./mainApp.types";
import type { MainAppMessage } from "./mainAppMessage";

export class MainAppEditorSave implements MainEditorSave {
    #message: MainAppMessage;
    #state: MainState;
    #nextRequestId: number = 1;
    pending: {
        requestId: number;
        promise: Promise<boolean>;
        resolve: (saved: boolean) => void;
        timeoutId: NodeJS.Timeout;
    } | null = null;

    constructor(state: MainState, message: MainAppMessage) {
        this.#state = state;
        this.#message = message;
    }

    resolveEditorSaveRequest = (requestId: number, saved: boolean) => {
        const pending = this.pending;
        if (!pending || pending.requestId !== requestId) return;
        clearTimeout(pending.timeoutId);
        this.pending = null;
        pending.resolve(!!saved);
    };

    requestEditorSave = () => {
        if (!this.#state.window.editor || this.#state.window.editor.isDestroyed?.()) {
            return Promise.resolve(false);
        }
        if (this.pending) return this.pending.promise;

        const requestId = this.#nextRequestId++;
        let resolve!: (saved: boolean) => void;
        const promise = new Promise<boolean>((res) => {
            resolve = res;
        });
        const timeoutId = setTimeout(() => {
            this.resolveEditorSaveRequest(requestId, false);
        }, 15000);

        this.pending = {
            requestId,
            promise,
            resolve,
            timeoutId
        };
        this.#message.sendToEditor("request-save", { requestId });
        return promise;
    };
}
