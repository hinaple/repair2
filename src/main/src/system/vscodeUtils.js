import { exec, spawn } from "child_process";

export function checkVscodeInstalled() {
    return new Promise((res) => {
        exec("code -v", (error, stdout, stderr) => {
            if (error) res(false);
            else res(true);
        });
    });
}

const env = { ...process.env };
delete env.NODE_ENV;
export function openVsCode(dir) {
    spawn("cmd.exe", ["/c", "code", dir], {
        cwd: dir,
        env,
        stdio: "ignore"
    }).unref();
}
