import { getRef } from "../refs";

export function goto(id: string | null, safe: boolean = false) {
  if (!id) return;
  getRef("nodes", id, safe)?.execute();
}

export function getGoto(id: string | null): Goto {
  if (!id) return;
  return () => goto(id);
}

export type Goto = (() => void) | undefined;
