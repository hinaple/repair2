import fs from "fs/promises";
import { join } from "path";
import { getFullScreenArea, getPrimaryScreenArea, getWindowArea } from "../screenManager";
import { migrateProject } from "../project/migrateProject";
import type { ProjectData } from "@shared/projectData.types";
import type { ReportLog } from "../logs/reportLog";
import type { MainContext } from "../app/mainContext.types";

type ProjectControllerOptions = {
    context: MainContext;
    appVersion: string;
    pluginDir: string;
    reportLog: ReportLog;
    sendStartupInfo: (message: string) => void;
    afterSplashClose: (callback: () => void) => void;
};

export class ProjectController {
    #afterSplashClose: (callback: () => void) => void;
    #appVersion: string;
    #context: MainContext;
    #pluginDir: string;
    #reportLog: ReportLog;
    #sendStartupInfo: (message: string) => void;

    constructor({
        context,
        appVersion,
        pluginDir,
        reportLog,
        sendStartupInfo,
        afterSplashClose
    }: ProjectControllerOptions) {
        this.#afterSplashClose = afterSplashClose;
        this.#appVersion = appVersion;
        this.#context = context;
        this.#pluginDir = pluginDir;
        this.#reportLog = reportLog;
        this.#sendStartupInfo = sendStartupInfo;
    }

    saveData(tempData: ProjectData) {
        const { state, paths } = this.#context;
        state.project.data = { ...tempData, updatedAt: new Date().getTime() };
        this.applyDataConfig();
        return fs
            .writeFile(join(paths.dataDir, "data.json"), JSON.stringify(state.project.data))
            .then(() => true)
            .catch(async (e: unknown) => {
                await this.#reportLog({
                    level: "error",
                    content: ["프로젝트 데이터 저장 중 오류가 발생했습니다:", e],
                    source: "project",
                    dialogue: true,
                    type: "project-save-error",
                    phase: "save",
                    subject: { kind: "project" }
                });
                return false;
            });
    }

    importDefaultProject() {
        const { service, paths } = this.#context;
        this.#sendStartupInfo("기본 프로젝트 로드 중...");
        return service.projectFileManager.importProject(paths.defaultProjectFile);
    }

    async loadData() {
        const { state, controllers, paths, system } = this.#context;
        this.#sendStartupInfo("데이터 파일 로드 중...");
        try {
            await fs.access(paths.dataDir);
            const tempData = (await fs.readFile(join(paths.dataDir, "data.json"))).toString();
            state.project.data = JSON.parse(tempData);
        } catch (err) {
            return await this.importDefaultProject();
        }

        this.#sendStartupInfo("프로젝트 버전 처리 중...");
        if (
            await migrateProject({
                currentVersion: this.#appVersion,
                data: state.project.data,
                dataDir: paths.dataDir,
                pluginDir: this.#pluginDir
            })
        ) {
            this.#afterSplashClose(() => {
                const parentWindow = state.window.editor || state.window.main;
                const options = {
                    message: "구버전 프로젝트",
                    detail: "호환되지 않는 기능이 포함된 버전의 프로젝트입니다. 일부 데이터에 손실이 있을 수 있습니다.",
                    type: "warning" as const,
                    noLink: true
                };
                if (parentWindow) system.dialog.showMessageBox(parentWindow, options);
                else system.dialog.showMessageBox(options);
            });
        }
        this.#sendStartupInfo("플러그인 처리 중...");
        await Promise.all([
            controllers.pluginHmr.setPluginManager(!!state.project.data?.config?.devMode),
            controllers.pluginHmr.updateCss()
        ]);
        this.applyDataConfig();

        this.#sendStartupInfo("Repair2 실행 중...");
        return true;
    }

    applyDataConfig() {
        const { state, controllers } = this.#context;
        if (!state.project.data?.config) return;

        controllers.pluginHmr.setDevMode(!!state.project.data.config?.devMode);

        if (!state.window.main) return;

        state.window.main.setAlwaysOnTop(!!state.project.data.config?.alwaysOnTop, "screen-saver");
        if (state.window.editor) {
            state.window.editor.setAlwaysOnTop(
                !!state.project.data.config?.alwaysOnTop,
                "screen-saver"
            );
        }
        state.window.main.setTitle?.(state.project.data.config?.title ?? "REPAIRv2");

        if (
            !state.project.data.config.screenConfig &&
            state.project.data.config.multiScreen !== undefined
        ) {
            const isMultiScreen = state.project.data.config.multiScreen;

            const area = isMultiScreen ? getFullScreenArea() : getPrimaryScreenArea();

            state.window.main.setBounds?.(area);
            return;
        }

        if (!state.project.data.config.screenConfig) return;

        const rectangle = getWindowArea(state.project.data.config);
        if (!rectangle) return;
        state.window.main.setBounds?.(rectangle);
    }

    getProjectExportName() {
        const { state } = this.#context;
        return (state.project.data?.config?.title ?? "REPAIRv2").replace(/\s/g, "_");
    }
}
