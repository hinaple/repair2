export type RepairAppData = any;

export type RepairSizeRatio = [number, number];

export type RepairEventUnsubscribe = () => void;

export interface RepairCommunicationUtils {
  socketSend(channel: string, ...data: unknown[]): void;
  serialSend(data: string): void;
}

export interface RepairEventUtils {
  addListener(channel: string, callback: (...data: unknown[]) => void): RepairEventUnsubscribe;

  emit(channel: string, data?: unknown): void;
}

export interface RepairResourceUtils {
  getElement(resourceTitle: string): HTMLImageElement | HTMLVideoElement | null;
  addPreload(resourceTitle: string): void;
  removePreload(resourceTitle: string): void;
  getResourcePath(resourceTitle: string): string | null;
}

export interface RepairStoreUtils {
  get<T = unknown>(key: string): Promise<T>;
  set(key: string, value: unknown): void;
}

export interface RepairVariableUtils {
  get(variableName: string): string | null;

  set(variableName: string, value: string | null): void;

  subscribe(
    variableName: string,
    callback: (value: string | null) => void
  ): RepairEventUnsubscribe | undefined;
}

export interface RepairUtilsApi {
  getAppData(): RepairAppData;
  getSizeRatio(): RepairSizeRatio;

  communication: RepairCommunicationUtils;
  event: RepairEventUtils;
  resources: RepairResourceUtils;
  store: RepairStoreUtils;
  variables: RepairVariableUtils;
}

declare global {
  var RepairUtils: Partial<RepairUtilsApi>;
}

export {};
