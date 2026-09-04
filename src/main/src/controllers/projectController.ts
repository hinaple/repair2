import fs from "fs/promises";
import { join } from "path";
import { getWindowArea } from "../system/screenManager";
import { migratePlugins, migrateProject } from "../project/migrate";
import { normalizeProjectData } from "@shared/projectData/normalize";
import { logger } from "../logs/logger";
import { convertToRuntime, convertToStored } from "../project/dataConvert/convertStoreData";
import type { PossibleStoredData, RuntimeProjectData } from "@shared/projectData/types";
import type { MainApp } from "../app/mainApp";

export class ProjectController {
  #app: MainApp;

  constructor(app: MainApp) {
    this.#app = app;
  }

  saveData(tempData: RuntimeProjectData) {
    const { state, paths } = this.#app;
    state.project.data = { ...tempData, updatedAt: Date.now() };
    this.applyDataConfig();
    return fs
      .writeFile(
        join(paths.dataDir, "data.json"),
        JSON.stringify(convertToStored(state.project.data))
      )
      .then(() => true)
      .catch((e) => {
        logger
          .with({
            source: "project",
            dialog: true,
            type: "project-save-error",
            phase: "save",
            subject: { kind: "project" }
          })
          .error("프로젝트 데이터 저장 중 오류가 발생했습니다:", e);
        return false;
      });
  }

  importDefaultProject() {
    const { service, paths, startup } = this.#app;

    logger.info("Importing default project");
    startup.sendStartupInfo("기본 프로젝트 로드 중...");
    return service.projectFileManager.importProject(paths.defaultProjectFile);
  }

  async loadData() {
    const { state, controllers, paths, system, startup } = this.#app;
    startup.sendStartupInfo("데이터 파일 로드 중...");
    let rawData: PossibleStoredData;
    try {
      // await fs.access(paths.dataDir);
      const tempData = (await fs.readFile(join(paths.dataDir, "data.json"))).toString();
      rawData = JSON.parse(tempData);
      state.project.data = convertToRuntime(
        normalizeProjectData(
          migrateProject({
            appVersion: this.#app.version,
            data: rawData
          })
        )
      );
    } catch (err: any) {
      logger.warning("An error occurred while loading data: ", err);
      return await this.importDefaultProject();
    }

    startup.sendStartupInfo("프로젝트 버전 처리 중...");
    const storedAppVer =
      (rawData && ("appVersion" in rawData ? rawData.appVersion : rawData.VERSION)) || null;
    if (
      await migratePlugins({
        appVersion: this.#app.version,
        projectAppVer: storedAppVer,
        dataDir: paths.dataDir,
        pluginDir: paths.pluginDir
      })
    ) {
      startup.afterSplashClose(() => {
        system.dialog.showMessageBox({
          message: "구버전 프로젝트",
          detail:
            "호환되지 않는 기능이 포함된 버전의 프로젝트입니다. 일부 데이터에 손실이 있을 수 있습니다.",
          type: "warning" as const,
          noLink: true
        });
      });
    }
    startup.sendStartupInfo("플러그인 처리 중...");
    await Promise.all([
      controllers.pluginHmr.setPluginManager(!!state.project.data?.config?.devMode),
      controllers.pluginHmr.updateCss()
    ]);
    this.applyDataConfig();

    startup.sendStartupInfo("Repair2 실행 중...");
    return true;
  }

  applyDataConfig() {
    const { state, controllers } = this.#app;
    if (!state.project.data?.config) return;

    controllers.pluginHmr.setDevMode(!!state.project.data.config?.devMode);

    if (!state.window.main) return;

    state.window.main.setAlwaysOnTop(!!state.project.data.config?.alwaysOnTop, "screen-saver");
    if (state.window.editor) {
      state.window.editor.setAlwaysOnTop(!!state.project.data.config?.alwaysOnTop, "screen-saver");
    }
    state.window.main.setTitle?.(state.project.data.config?.title ?? "REPAIRv2");

    if (!state.project.data.config.screenConfig) return;

    const rectangle = getWindowArea(state.project.data.config);
    if (!rectangle) return;
    state.window.main.setBounds?.(rectangle);
  }

  getProjectExportName() {
    const { state } = this.#app;
    return (state.project.data?.config?.title ?? "REPAIRv2").replace(/\s/g, "_");
  }
}
