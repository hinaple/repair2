import type { Types } from "@shared/projectData/types";
import type { NodeController } from "../types";
import { Base } from "../base";
import { sendChanges } from "../../lib/runtimeMonitor";
import { getGoto } from "./output";

export class Entry extends Base<Types.Entry> implements NodeController {
    private goto?: () => void;

    init() {
        this.goto = getGoto(this.d.output);
    }
    sendChange(type: "entered" | "disabled" | "activated") {
        sendChanges("entry", type, this.d.id);
    }
    enter() {
        this.sendChange("entered");
        this.goto?.();
    }
    execute() {
        throw new Error(`Entry ${this.d.id} is not standby mode, which means it is unexecutable`);
    }
}
