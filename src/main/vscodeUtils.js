import { exec } from "child_process";

export function checkVscodeInstalled() {
    return new Promise((res) => {
        exec("code --v", (error, stdout, stderr) => {
            if (error) res(false);
            else res(true);
        });
    });
}

export function openVsCode(dir) {
    exec(`code ${dir}`);
}
