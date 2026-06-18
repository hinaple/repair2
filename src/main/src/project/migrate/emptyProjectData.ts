import { ProjectData } from "@shared/projectData/types";

export function makeEmptyProjectData(appVersion: string): ProjectData {
    return {
        version: 2,
        appVersion,
        config: {},
        resources: {},
        variables: {},
        nodes: {},
        steps: {},
        components: {},
        elements: {},
        listeners: {},
        values: {},
        valueProcesses: {},
        pluginPointers: {},
        updatedAt: Date.now()
    };
}
