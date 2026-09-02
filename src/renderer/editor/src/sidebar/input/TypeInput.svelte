<script lang="ts">
  import { genId } from "@shared/genId";
  import { forEachRelationId } from "@shared/projectData/relation";
  import { createPayload } from "@shared/projectData/typePayload/create";
  import { PayloadTemplates } from "@shared/projectData/typePayload/templates";
  import type { TypePayloadMap } from "@shared/projectData/typePayload";
  import type { RecordKey } from "@shared/constants";
  import type { FieldBinding } from "../../project/mutator";
  import { getMutator } from "../../project/store";
  import Select from "./Select.svelte";

  type TypeName = keyof TypePayloadMap;
  type TypePayloadValue = { type: string; payload: unknown; [key: string]: unknown };

  let {
    binding,
    typeName,
    options: labelMap = {},
    onchange = null
  }: {
    binding: FieldBinding<TypePayloadValue>;
    typeName: TypeName;
    options?: Record<string, string>;
    onchange?: (() => unknown) | null;
  } = $props();

  let value = $derived(binding.value);
  let draftParts = $state(value.type ? value.type.split(".") : []);

  $effect(() => {
    draftParts = value.type ? value.type.split(".") : [];
  });

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function typeKeys(value: unknown): string[] {
    return isRecord(value) ? Object.keys(value).filter((key) => key !== "$types") : [];
  }

  function isTypeGroup(value: unknown): value is Record<string, unknown> {
    return isRecord(value) && value.$types === true;
  }

  let levels = $derived.by(() => {
    const result: string[][] = [];
    let node: unknown = PayloadTemplates[typeName];
    result.push(typeKeys(node));

    for (const part of draftParts) {
      if (!isRecord(node)) break;
      node = node[part];
      if (isTypeGroup(node)) result.push(typeKeys(node));
      else break;
    }

    return result;
  });

  const missingNode = Symbol("missingNode");

  function templateNode(parts: string[]): unknown | typeof missingNode {
    let node: unknown = PayloadTemplates[typeName];

    for (const part of parts) {
      if (!isRecord(node) || !(part in node)) return missingNode;
      node = node[part];
    }

    return node;
  }

  function optionsFor(levelOptions: string[], level: number): [string, string][] {
    return levelOptions.map((option) => {
      const path = [...draftParts.slice(0, level), option].join(".");
      return [option, labelMap[option] ?? labelMap[path] ?? option];
    });
  }

  function selectPart(selected: string, level: number) {
    const nextParts = [...draftParts.slice(0, level), selected];
    const node = templateNode(nextParts);
    if (node === missingNode) return;

    draftParts = nextParts;
    if (isTypeGroup(node)) return;

    changeType(nextParts.join("."));
  }

  function changeType(nextType: string) {
    if (nextType === value.type) return;

    const mutator = getMutator();
    mutator.transaction(() => {
      const oldOwned: { type: RecordKey; id: string }[] = [];
      const isRootRecord = binding.target.kind === "record" && binding.path.length === 0;

      if (isRootRecord) {
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
      const nextValue = { ...value, type: nextType, payload };
      binding.set(nextValue);

      if (isRootRecord) {
        const retained = new Set<string>();
        forEachRelationId(
          binding.target.type,
          nextValue as never,
          ({ type, id }) => retained.add(`${type}:${id}`),
          { onlyOwns: true }
        );

        for (const owned of oldOwned) {
          if (!retained.has(`${owned.type}:${owned.id}`)) {
            mutator.deleteTree(owned.type, owned.id);
          }
        }
      }
    });

    onchange?.();
  }
</script>

<div class="types">
  {#each levels as levelOptions, i}
    {#key `${i}:${draftParts.slice(0, i).join(".")}`}
      <Select
        value={draftParts[i] ?? null}
        options={optionsFor(levelOptions, i)}
        placeholder={labelMap[""] ?? "유형 선택"}
        autofocus={i > 0 && i === draftParts.length}
        onchange={(selected) => {
          if (selected !== null) selectPart(selected, i);
        }}
      />
    {/key}
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
