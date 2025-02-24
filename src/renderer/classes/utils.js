import { randomBytes } from "crypto";
import Sequence from "./sequence.svelte";
import Branch from "./branch.svelte";
import Config from "./config.svelte";

export function genId() {
    return randomBytes(20).toString("hex");
}

export function classify(dataObj) {
    dataObj.nodes = dataObj.nodes.map((s) => {
        if (s.type === "sequence") return new Sequence(s);
        else if (s.type === "branch") return new Branch(s);
    });
    dataObj.config = new Config(dataObj.config);
    return dataObj;
}
