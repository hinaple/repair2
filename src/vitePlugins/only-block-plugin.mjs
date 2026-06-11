export default function onlyBlockPlugin(options = {}) {
    const { target = "", dir = "" } = options;

    return {
        name: "only-block-plugin",
        enforce: "pre",

        transform(code, id) {
            if (!id.includes(dir) || !id.endsWith(".js")) return;

            const lines = code.split("\n");
            let currentBlock = null;
            let lastOpenedLineNo = null;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === "//#endonly") {
                    if (!currentBlock) {
                        this.error(`Unexpected //#endonly at ${id}:${i}`);
                        return null;
                    }
                    currentBlock = null;
                    continue;
                }
                const matched = lines[i].match(/^\s*\/\/#only\s+([a-z]+)\s*$/);
                if (matched) {
                    if (currentBlock) {
                        this.error(`Nested only block with line ${lastOpenedLineNo} at ${id}:${i}`);
                        return null;
                    }
                    currentBlock = matched[1];
                    lastOpenedLineNo = i;
                    continue;
                }
                if (currentBlock && currentBlock !== target) lines[i] = "//" + lines[i];
            }

            if (lastOpenedLineNo === null) return null;
            if (currentBlock) this.error(`Unclosed only block at ${id}:${lastOpenedLineNo}`);

            return lines.join("\n");
        }
    };
}
