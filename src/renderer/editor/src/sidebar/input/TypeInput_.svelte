<script lang="ts">
  import { genId } from "@shared/genId";
  import { forEachRelationId } from "@shared/projectData/relation";
  import { createPayload } from "@shared/projectData/typePayload/create";
  import { PayloadTemplates } from "@shared/projectData/typePayload/templates";
  import type { TypePayloadMap } from "@shared/projectData/typePayload";
  import type { RecordKey } from "@shared/constants";
  import type { FieldBinding } from "../../project/mutator";
  import { getMutator } from "../../project/store";

  type TypeName = keyof TypePayloadMap;
  type TypePayloadValue = { type: string; payload: unknown; [key: string]: unknown };

  let {
    binding,
    typeName,
    options = {},
    onchange = null,
    ...props
  }: {
    binding: FieldBinding<TypePayloadValue>;
    typeName: TypeName;
    options?: Record<string, string>;
    onchange?: (() => unknown) | null;
    [key: string]: unknown;
  } = $props();

  let value = $derived(binding.value);
  let parts = $derived((value.type || "").split(".").filter(Boolean));

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function keys(value: unknown): string[] {
    return isRecord(value) ? Object.keys(value).filter((key) => key !== "$types") : [];
  }

  let levels = $derived.by(() => {
    const result: string[][] = [];
    let node: unknown = PayloadTemplates[typeName];
    result.push(keys(node));
    for (const part of parts) {
      if (!isRecord(node)) break;
      node = node[part];
      if (isRecord(node) && node.$types === true) result.push(keys(node));
      else break;
    }
    return result;
  });

  function firstLeaf(prefix: string[]): string[] {
    let node: unknown = PayloadTemplates[typeName];
    for (const part of prefix) node = isRecord(node) ? node[part] : null;
    while (isRecord(node) && node.$types === true) {
      const first = keys(node)[0];
      if (!first) break;
      prefix.push(first);
      node = node[first];
    }
    return prefix;
  }

  function changeType(selected: string, level: number) {
    const nextType = firstLeaf([...parts.slice(0, level), selected]).join(".");
    if (nextType === value.type) return;
    const mutator = getMutator();
    mutator.transaction(() => {
      const oldOwned: { type: RecordKey; id: string }[] = [];
      if (binding.target.kind === "record" && binding.path.length === 0) {
        forEachRelationId(
          binding.target.type,
          value as never,
          ({ type, id }) => oldOwned.push({ type, id }),
          { onlyOwns: true }
        );
      }

      const payload = createPayload(typeName, nextType as never, undefined, (type, data) => {
        const id = "id" in data && typeof data.id === "string" ? data.id : genId();
        mutator.add(type, id, data);
        return id;
      });
      binding.set({ ...value, type: nextType, payload });

      const retained = new Set<string>();
      if (binding.target.kind === "record" && binding.path.length === 0) {
        forEachRelationId(
          binding.target.type,
          { ...value, type: nextType, payload } as never,
          ({ type, id }) => retained.add(`${type}:${id}`),
          { onlyOwns: true }
        );
      }
      for (const owned of oldOwned) {
        if (!retained.has(`${owned.type}:${owned.id}`)) mutator.deleteTree(owned.type, owned.id);
      }
    });
    onchange?.();
  }
</script>

<div class="types">
  {#each levels as levelOptions, i}
    <select
      value={parts[i] ?? ""}
      onchange={(event) => changeType(event.currentTarget.value, i)}
      {...props}
    >
      <option value="" hidden>유형 선택</option>
      {#each levelOptions as option}
        <option value={option}
          >{options[parts.slice(0, i).concat(option).join(".")] ??
            options[option] ??
            option}</option
        >
      {/each}
    </select>
  {/each}
</div>

<style>
  .types {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
</style>
