import { electronApp, is } from "@electron-toolkit/utils";

import { setupIpcHandlers } from "../ipc";
import { registerLogger } from "../logs/logger";
import { testLogs } from "../test/logContent.test";
import { MainAppEditorSave } from "./mainAppEditorSave";
import { GlobalKey } from "../system/globalKey";
import { createReporter } from "./createReporter";
import { MainAppMessage } from "./mainAppMessage";
import { MainAppServices } from "./mainAppServices";
import { MainAppStartup } from "../windows/splash";
import { createMainAppState } from "./state";
import { createControllers } from "./mainAppControllers";
import { createSystem } from "./mainAppSystem";
import { paths } from "./mainAppPaths";
import { LogStore } from "../logs/logStore";
import { Store } from "../system/store";

declare const __APP_VERSION__: string;
export class MainApp {
    readonly version = __APP_VERSION__;
    readonly isDev = is.dev;
    readonly paths = paths;
    readonly system = createSystem(this);
    readonly state = createMainAppState();
    readonly controllers = createControllers(this);
    readonly logStore = new LogStore();
    readonly reportLog = createReporter(this);
    readonly service = new MainAppServices();
    readonly message = new MainAppMessage(this.state);
    readonly editorSave = new MainAppEditorSave(this.state, this.message);
    readonly startup = new MainAppStartup(this);
    readonly globalKey = new GlobalKey();
    readonly store = new Store(this.paths.storePath);
    readonly config = this.store.makeConfig();

    start() {
        registerLogger(this.reportLog);
        if (import.meta.env.DEV) testLogs();

        this.service.initialize(this);
        this.#registerAppLifecycle();

        this.system.app.on("window-all-closed", () => {
            this.system.app.quit();
        });
    }

    async #appOpenedWithProject(argv: string[], appWasRunning = true) {
        if (argv.length < 2) return false;

        const filePath = argv.find((arg) => arg.endsWith(".repair"));
        if (!filePath) return false;

        const confirm = await this.system.dialog.showMessageBox({
            type: "info",
            title: "프로젝트 불러오기",
            message: "프로젝트를 불러올까요?",
            detail: "기존에 편집 중이던 프로젝트의 정보가 삭제됩니다.",
            buttons: ["확인", "취소"],
            cancelId: 1,
            defaultId: 0,
            noLink: true
        });
        if (confirm.response !== 0) {
            if (!appWasRunning) this.system.app.quit();
            return false;
        }
        await this.service.projectFileManager.importProject(filePath);

        return true;
    }

    #registerAppLifecycle() {
        if (!this.system.app.requestSingleInstanceLock()) {
            this.system.app.quit();
            return;
        }

        this.system.app.on("second-instance", async (_event, argv) => {
            if (!this.state.window.main) return;

            await this.#appOpenedWithProject(argv, true);
        });

        this.system.app.on("ready", async () => {
            electronApp.setAppUserModelId("com.repair2");

            setupIpcHandlers(this);

            if (!(await this.#appOpenedWithProject(process.argv, false))) {
                this.startup.showSplash();
                await Promise.all([
                    new Promise((res) => setTimeout(res, 3000)),
                    this.controllers.project.loadData()
                ]);
            }

            if (this.isDev) {
                this.controllers.window.createMainWindow();
                this.controllers.window.createEditorWindow();
            } else {
                this.controllers.window.createMainWindow();
            }
        });
    }
}
