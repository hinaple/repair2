import { createLogEntry, createLogFingerprint, type LogEntryInput } from "./logEntry";
import type { LogChange, LogEntry, LogListFilter } from "@shared/log.types";

export type { LogChange, LogEntry, LogListFilter } from "@shared/log.types";

type LogChangeListener = (change: LogChange) => void;

class LogStore {
    private entries = new Map<string, LogEntry>();
    private lastEntryId: string | null = null;
    private lastFingerprint: string | null = null;
    private listeners = new Set<LogChangeListener>();

    record(input: LogEntryInput) {
        const fingerprint = createLogFingerprint(input);
        const previous = this.lastEntryId ? (this.entries.get(this.lastEntryId) ?? null) : null;

        if (fingerprint && previous && this.lastFingerprint === fingerprint) {
            const entry = createLogEntry({
                ...input,
                id: previous.id,
                createdAt: previous.createdAt,
                count: previous.count + 1
            });

            this.entries.set(entry.id, entry);
            this.emit({ type: "update", entry });
            return entry;
        }

        const entry = createLogEntry(input);

        this.entries.set(entry.id, entry);
        this.lastEntryId = entry.id;
        this.lastFingerprint = fingerprint;
        this.emit({ type: "append", entry });
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
                if (filter.subjectId && entry.subject?.id !== filter.subjectId) return false;
                if (filter.subjectKind && entry.subject?.kind !== filter.subjectKind) return false;
                return true;
            })
            .reverse();
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
