import type {
    MainService,
    ProjectFileManagerService,
    SerialService,
    SocketService
} from "./mainContext.types";
import type { PluginManager } from "../plugin/pluginManager";

type ServiceSlots = {
    pluginManager: PluginManager | null;
    projectFileManager: ProjectFileManagerService | null;
    socket: SocketService | null;
    serial: SerialService | null;
};

function requireService<Key extends keyof Omit<ServiceSlots, "pluginManager">>(
    slots: ServiceSlots,
    key: Key
) {
    const service = slots[key];
    if (!service) throw new Error(`${String(key)} service is not initialized.`);
    return service;
}

export function createServiceRegistry(): MainService {
    const slots: ServiceSlots = {
        pluginManager: null,
        projectFileManager: null,
        socket: null,
        serial: null
    };

    return {
        get pluginManager() {
            return slots.pluginManager;
        },
        set pluginManager(pluginManager) {
            slots.pluginManager = pluginManager;
        },
        get projectFileManager() {
            return requireService(slots, "projectFileManager");
        },
        set projectFileManager(projectFileManager) {
            slots.projectFileManager = projectFileManager;
        },
        get socket() {
            return requireService(slots, "socket");
        },
        set socket(socket) {
            slots.socket = socket;
        },
        get serial() {
            return requireService(slots, "serial");
        },
        set serial(serial) {
            slots.serial = serial;
        }
    };
}
