import { logContent } from "@shared/logContent";
import { logger } from "../logs/logger";

class CustomClass {
    constructor(public name = "custom") {}
    value = 123;
}

class ThrowingToString {
    toString() {
        throw new Error("toString failed");
    }
}

const buffer = new ArrayBuffer(8);
new Uint8Array(buffer).set([1, 2, 3, 4]);

const circular: any = { name: "circular" };
circular.self = circular;

const shared = { id: "shared" };
const repeatedRef = { first: shared, second: shared };

const arrayCycle: any[] = ["array-cycle"];
arrayCycle.push(arrayCycle);

const mapCycle = new Map<any, any>();
mapCycle.set("self", mapCycle);

const setCycle = new Set<any>();
setCycle.add(setCycle);

const nullProto = Object.create(null);
nullProto.ok = true;
nullProto.message = "null prototype";

const getterThrows: any = {};
Object.defineProperty(getterThrows, "bad", {
    enumerable: true,
    get() {
        throw new Error("getter failed");
    }
});

const fn = function namedFunction(a: unknown) {
    return a;
};

const asyncFn = async function asyncFunction() {
    return "done";
};

const typedArrays = [
    new Int8Array([-1, 0, 1]),
    new Uint8Array([0, 1, 255]),
    new Uint8ClampedArray([0, 128, 255]),
    new Int16Array([-1, 0, 1]),
    new Uint16Array([0, 1, 65535]),
    new Int32Array([-1, 0, 1]),
    new Uint32Array([0, 1, 4294967295]),
    new Float32Array([0.1, NaN, Infinity]),
    new Float64Array([0.1, NaN, Infinity]),
    new BigInt64Array([1n, -1n]),
    new BigUint64Array([1n, 2n])
];

if ("Float16Array" in globalThis) {
    typedArrays.push(new (globalThis as any).Float16Array([0.1, 1.5]));
}

const cases: Array<[string, any]> = [
    ["undefined", undefined],
    ["null", null],
    ["primitives", ["text", "", 0, -0, NaN, Infinity, false, true, 123n]],
    ["symbol", Symbol("sample")],
    ["function", fn],
    ["async function", asyncFn],
    ["error", new Error("plain error")],
    ["error with cause", new Error("outer", { cause: new TypeError("inner") })],
    ["date", new Date("2026-06-07T00:00:00.000Z")],
    ["date", ["date", new Date("2026-06-07T00:00:00.000Z")]],
    ["regexp", /repair\d+/gi],
    ["array buffer", buffer],
    ["data view", new DataView(buffer)],
    ["typed arrays", typedArrays],
    ["plain object", { a: 1, b: "text", c: false, d: null }],
    ["nested object", { a: { b: { c: [1, "x", { y: true }] } } }],
    ["custom class", new CustomClass()],
    ["null prototype object", nullProto],
    // ["throwing toString class", new ThrowingToString()],
    // ["getter throws", getterThrows],
    [
        "map",
        new Map<any, any>([
            ["a", 1],
            [{ objectKey: true }, { nested: "value" }]
        ])
    ],
    ["set", new Set<any>([1, "x", { object: true }])],
    ["circular object", circular],
    ["repeated ref object", repeatedRef],
    ["array cycle", arrayCycle],
    ["map cycle", mapCycle],
    ["set cycle", setCycle],
    ["mixed console-like args", ["message", { payload: [1, 2] }, new Error("mixed error")]],
    [
        "long test",
        "asd;kjasdkljaslkdjaljsdhausdhjkashdkjashdjkash dajhadsjhdakjdslkjaslkhjsdgf;ukwhej sdahja hj; ads da s"
    ]
];

function safeJson(value: unknown) {
    try {
        return JSON.stringify(value);
    } catch (error) {
        return `[JSON failed] ${(error as Error).message}`;
    }
}

function safeStructuredClone(value: unknown) {
    try {
        structuredClone(value);
        return "ok";
    } catch (error) {
        return `failed: ${(error as Error).message}`;
    }
}

export function testLogs() {
    for (const [name, input] of cases) {
        console.log(`\n=== ${name} ===`);
        try {
            // const once = logContent(input);
            // const twice = logContent(once as any);

            // console.log("structuredClone:", safeStructuredClone(once));
            // console.log("json:", safeJson(once));
            // console.log("double-json:", safeJson(twice));
            // console.dir(once, { depth: 12 });
            if (name.includes("error")) logger.error(...(Array.isArray(input) ? input : [input]));
            else logger.info(...(Array.isArray(input) ? input : [input]));
        } catch (error) {
            console.error("logDetail failed:", error);
        }
    }
}
