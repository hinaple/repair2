import { dialog } from "electron";
import type { MainApp } from "../app/mainApp";

const DialogMethodNames = [
    "showCertificateTrustDialog",
    "showMessageBox",
    "showMessageBoxSync",
    "showOpenDialog",
    "showOpenDialogSync",
    "showSaveDialog",
    "showSaveDialogSync"
] as const;

type DialogMethodName = (typeof DialogMethodNames)[number];

type OneArgDialogMethod<T> = T extends (options: infer Options) => infer Result
    ? (options: Options) => Result
    : never;

export type NewDialogs = {
    [K in DialogMethodName]: OneArgDialogMethod<Electron.Dialog[K]>;
};

export function createDialogs(app: MainApp): NewDialogs {
    function withOrWithoutWindow<T extends (...params: any[]) => any>(
        callback: T,
        ...opt: Parameters<T>
    ): ReturnType<T> {
        const owner = app.state.window.editor ?? app.state.window.main;
        if (owner) return callback(owner, ...opt);
        return callback(...opt);
    }

    return Object.fromEntries(
        DialogMethodNames.map((key) => [
            key,
            (...opt: Parameters<NewDialogs[typeof key]>): ReturnType<NewDialogs[typeof key]> =>
                withOrWithoutWindow(dialog[key], ...opt)
        ])
    ) as NewDialogs;
}
