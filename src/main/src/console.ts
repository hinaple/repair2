import pc from "picocolors";
import type { Formatter } from "picocolors/types";

type CliLogTypes = "error" | "warning" | "info" | "status";
const TypeColors: Record<CliLogTypes, { full: Formatter; title?: Formatter }> = {
    error: { full: pc.redBright, title: (input) => pc.bgRedBright(pc.whiteBright(pc.bold(input))) },
    warning: { full: pc.yellowBright },
    info: { full: pc.blueBright },
    status: { full: pc.greenBright }
};

export function cliLog(type: CliLogTypes, arg0: string, arg1?: string) {
    if (!arg1) {
        console.log(TypeColors[type].full(arg0));
        return;
    }
    console.log(TypeColors[type].full((TypeColors[type].title ?? pc.bold)(`[${arg0}]`)));
    console.log(
        arg1
            .split("\n")
            .map((s) => TypeColors[type].full(`\t${s}`))
            .join("\n")
    );
}

type Logger = {
    (content: string): void;
    (title: string, content: string): void;
};
export const cli = Object.fromEntries(
    (Object.keys(TypeColors) as CliLogTypes[]).map((type) => [
        type,
        (arg0: string, arg1?: string) => cliLog(type as CliLogTypes, arg0, arg1)
    ])
) as Record<CliLogTypes, Logger>;
