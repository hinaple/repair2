import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { logger } from "../logs/logger";

function normalizeKey(key: string) {
    return key
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

const CONFIG_KEY = "config";

function keyAndPath(key: string | string[], safe: boolean = true): [string, string[]] {
    const arr = Array.isArray(key) ? key : key.split(".");
    let k = normalizeKey(arr[0]);
    return [k === CONFIG_KEY && safe ? `_${k}` : k, arr.toSpliced(0, 1)];
}

function isPlainObject(val: any) {
    return typeof val === "object" && val !== null && !Array.isArray(val);
}

function setPropertyAt(data: any, keys: string[], val: any, _step = 0): any {
    if (_step === keys.length) return val;

    if (!isPlainObject(data)) data = {};
    const currentKey = keys[_step];
    return { ...data, [currentKey]: setPropertyAt(data[currentKey], keys, val, _step + 1) };
}

export class Store {
    #stores: Map<string, any> = new Map();
    #storePath: string;
    constructor(storePath: string) {
        this.#storePath = storePath;
    }
    async #getData(k: string, forceUpdate: boolean): Promise<any> {
        if (!forceUpdate) {
            const existing = this.#stores.get(k);
            if (existing) return existing;
        }
        let data;
        try {
            const content = await readFile(join(this.#storePath, `${k}.json`), "utf8");
            data = JSON.parse(content);
        } catch {
            data = {};
        }
        this.#stores.set(k, data);
        return data;
    }
    async #setData(k: string, value: any) {
        this.#stores.set(k, value);
        try {
            await writeFile(join(this.#storePath, `${k}.json`), JSON.stringify(value), "utf8");
        } catch (err: any) {
            logger.source("store").error("An error occurred while storing data: ", err);
        }
    }
    async get(key: string | string[], forceUpdate: boolean = false) {
        const [k, p] = keyAndPath(key, true);
        let result: any = await this.#getData(k, forceUpdate);
        for (const current of p) {
            if (!result || !(k in result)) return undefined;
            result = result[current];
        }
        return result;
    }
    set(key: string | string[], value: any) {
        const [k, p] = keyAndPath(key, true);
        return this.#setData(k, setPropertyAt(this.#getData(k, false), p, value));
    }
    makeConfig() {
        const getConfig = (keys: string | string[], forceUpdate: boolean = false) => {
            const arr = Array.isArray(keys) ? keys : keys.split(".");
            return this.get([CONFIG_KEY, ...arr], forceUpdate);
        };
        const setConfig = (keys: string | string[], value: any) => {
            const arr = Array.isArray(keys) ? keys : keys.split(".");
            return this.set([CONFIG_KEY, ...arr], value);
        };
        return { get: getConfig, set: setConfig };
    }
}
