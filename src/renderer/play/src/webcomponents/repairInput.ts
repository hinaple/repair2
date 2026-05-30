import { setVar, subscribe } from "../lib/variables";

export default class RepairInput extends HTMLElement {
    private unsubscribers: Array<() => void> = [];
    private _value: string | null = null;
    private variableId: string | null;
    private inputListeners: Array<Function> = [];
    public maxLength: number | null = null;
    public securityText: string | null = null;

    private display: HTMLElement | null = null;
    private blinkCursor: HTMLDivElement | null = null;
    constructor({
        variableId = null,
        maxLength = null,
        securityText = null
    }: {
        variableId: string | null;
        maxLength: number | null;
        securityText: string | null;
    }) {
        super();
        this.variableId = variableId;
        this.maxLength = maxLength;
        this.securityText = securityText;

        this.display = document.createElement("span");
        this.blinkCursor = document.createElement("div");
        this.blinkCursor.classList.add("advanced-input-blink-cursor");

        this.append(this.display, this.blinkCursor);

        if (variableId)
            this.registerUnsubscriber(subscribe(variableId, (value: any) => (this.value = value)));
    }
    setValue(v: string) {
        this.value = v;

        this.inputListeners.forEach((listener) => listener({ value: this.value }));
        if (this.variableId) setVar(this.variableId, this.value);
    }
    set value(v: string) {
        let tempV = v ?? "";
        if (this.maxLength !== null) tempV = tempV.substring(0, this.maxLength);

        if (this.display)
            this.display.innerText = this.securityText
                ? this.securityText.repeat(tempV.length)
                : tempV;
        this._value = tempV;
    }
    get value(): string {
        return this._value ?? "";
    }
    registerUnsubscriber(unsub: (() => void) | null = null) {
        if (!unsub) return;
        this.unsubscribers.push(unsub);
    }
    isInputEvent(evt: KeyboardEvent) {
        return evt.key.length === 1 && !evt.altKey && !evt.ctrlKey;
    }
    connectedCallback() {
        const onkeydownOpt: [string, (evt: any) => void, object] = [
            "keydown",
            (evt) => {
                if (evt.key === "Backspace")
                    this.setValue(this.value.substring(0, this.value.length - 1));
                else if (this.isInputEvent(evt)) this.setValue(this.value + evt.key);
            },
            { capture: true }
        ];
        document.documentElement.addEventListener(...onkeydownOpt);
        this.registerUnsubscriber(() =>
            document.documentElement.removeEventListener(...onkeydownOpt)
        );
    }
    disconnectedCallback() {
        this.unsubscribers.forEach((fn) => fn());
    }
    addEventListener(
        type: keyof HTMLElementEventMap,
        listener: (evt: any) => void,
        options?: any
    ): void {
        if (type === "input") {
            this.inputListeners.push(listener);
        } else if (type === "keydown") {
            document.documentElement.addEventListener(type, listener, options);
            this.registerUnsubscriber(() =>
                document.documentElement.removeEventListener(type, listener, options)
            );
        } else super.addEventListener(type, listener, options);
    }
}

customElements.define("repair-input", RepairInput);
