import { app, shell } from "electron";
import { createDialogs } from "../system/dialog";
import type { MainSystem } from "./mainApp.types";
import type { MainApp } from "./mainApp";

export function createSystem(_app: MainApp): MainSystem {
    return {
        app,
        dialog: createDialogs(_app),
        shell
    };
}
