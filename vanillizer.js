// vite.config.js
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
const traverse = _traverse.default;
const generate = _generate.default;

const unvanillaFunctions = ["$state", "$derived", "$state.snapshot"];

export default {
    name: "vanillizer",
    transform(code, id) {
        if (!id.match(/\.svelte\.js$/)) return;

        const ast = parse(code, {
            sourceType: "module",
            plugins: ["jsx"]
        });

        traverse(ast, {
            CallExpression(path) {
                if (!unvanillaFunctions.includes(path.node.callee.name)) return;
                if (path.node.arguments.length === 0) path.replaceWithSourceString("null");
                else path.replaceWith(path.node.arguments[0]);
            }
        });
        const output = generate(ast, {}, code);
        return {
            code: output.code,
            map: null
        };
    }
};
