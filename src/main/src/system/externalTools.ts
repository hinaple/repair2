import { exec, spawn, type SpawnOptions } from "child_process";
import type { MainState } from "../app/state";

export type ExternalTools = {
  vscode: boolean;
  npm: boolean;
};

function cmdTest(command: string): Promise<boolean> {
  return new Promise((res) => {
    exec(
      command,
      {
        windowsHide: true
      },
      (error) => res(!error)
    );
  });
}

export async function checkExternalTools(state: MainState): Promise<ExternalTools> {
  const [vscode, npm] = await Promise.all([cmdTest("code -v"), cmdTest("npm -v")]);
  state.externalTools = { vscode, npm };
  return state.externalTools;
}

const cleanEnv = { ...process.env };
delete cleanEnv.NODE_ENV;

export function openVsCode(dir: string) {
  spawn("cmd.exe", ["/c", "code", dir], {
    cwd: dir,
    env: cleanEnv,
    stdio: "ignore",
    windowsHide: true
  }).unref();
}

function spawnPromise(
  args: string[],
  options: SpawnOptions
): Promise<{ error: any; message: string }> {
  return new Promise((res) => {
    const child = spawn("cmd.exe", ["/c", ...args], {
      windowsHide: true,
      env: cleanEnv,
      stdio: ["ignore", "pipe", "pipe"],
      ...options
    });

    let done = false;
    function end(error: any) {
      if (!child.killed) child.kill();
      if (done) return;

      res({ error, message });
      done = true;
    }

    child.on("close", (code) => {
      end(code ? { code } : null);
    });

    child.on("error", (error) => {
      end(error);
    });

    let message = "";
    child.stdout?.setEncoding("utf-8");
    child.stdout?.on("data", (data) => {
      message += data;
    });
    child.stderr?.setEncoding("utf-8");
    child.stderr?.on("data", (data) => {
      message += data;
    });
  });
}

export function npmInstall(dir: string) {
  return spawnPromise(["npm", "install"], { cwd: dir });
}
