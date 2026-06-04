import {
    createLogEntry,
    createLogGroupKey,
    type LogEntry,
    type LogEntryInput,
    type LogLevel
} from "./logEntry";

type LogChange =
    | { type: "upsert"; entry: LogEntry }
    | { type: "resolve"; entry: LogEntry }
    | { type: "clear"; entries: LogEntry[] };

export type LogListFilter = {
    source?: string;
    level?: LogLevel | LogLevel[];
    status?: LogEntry["status"];
    subjectId?: string;
    subjectKind?: string;
};

type LogChangeListener = (change: LogChange) => void;

class LogStore {
    private entries = new Map<string, LogEntry>();
    private groupIndex = new Map<string, string>();
    private listeners = new Set<LogChangeListener>();

    upsert(input: LogEntryInput) {
        const groupKey = input.groupKey ?? createLogGroupKey(input);
        const previousId = this.groupIndex.get(groupKey);
        const previous = previousId ? (this.entries.get(previousId) ?? null) : null;
        const entry = createLogEntry({ ...input, groupKey }, previous);

        this.entries.set(entry.id, entry);
        this.groupIndex.set(entry.groupKey, entry.id);
        this.emit({ type: "upsert", entry });
        return entry;
    }

    resolve(groupKey: string) {
        const id = this.groupIndex.get(groupKey);
        if (!id) return null;

        const previous = this.entries.get(id);
        if (!previous) return null;

        const entry: LogEntry = {
            ...previous,
            status: "resolved",
            toast: "none",
            updatedAt: Date.now()
        };
        this.entries.set(entry.id, entry);
        this.emit({ type: "resolve", entry });
        return entry;
    }

    get(id: string) {
        return this.entries.get(id) ?? null;
    }

    list(filter: LogListFilter = {}) {
        const levels = Array.isArray(filter.level)
            ? new Set(filter.level)
            : filter.level
              ? new Set([filter.level])
              : null;

        return [...this.entries.values()]
            .filter((entry) => {
                if (filter.source && entry.source !== filter.source) return false;
                if (levels && !levels.has(entry.level)) return false;
                if (filter.status && entry.status !== filter.status) return false;
                if (filter.subjectId && entry.subject?.id !== filter.subjectId) return false;
                if (filter.subjectKind && entry.subject?.kind !== filter.subjectKind) return false;
                return true;
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    clear(filter: LogListFilter = {}) {
        const targets = this.list(filter);
        targets.forEach((entry) => {
            this.entries.delete(entry.id);
            if (this.groupIndex.get(entry.groupKey) === entry.id)
                this.groupIndex.delete(entry.groupKey);
        });
        this.emit({ type: "clear", entries: targets });
        return targets;
    }

    subscribe(listener: LogChangeListener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(change: LogChange) {
        this.listeners.forEach((listener) => listener(change));
    }
}

export const logStore = new LogStore();
export type { LogEntry };
