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
  type TypeOption =
    | { value: string; label: string }
    | { type: "submenu"; label: string; options: TypeOption[] };

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

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function typeKeys(value: unknown): string[] {
    return isRecord(value) ? Object.keys(value).filter((key) => key !== "$types") : [];
  }

  function isTypeGroup(value: unknown): value is Record<string, unknown> {
    return isRecord(value) && value.$types === true;
  }

  function createTypeOptions(node: unknown, prefix: string[] = []): TypeOption[] {
    if (!isRecord(node)) return [];

    return typeKeys(node).map((key) => {
      const child = node[key];
      const parts = [...prefix, key];
      const path = parts.join(".");
      const label = labelMap[key] ?? labelMap[path] ?? key;

      if (isTypeGroup(child)) {
        return {
          type: "submenu",
          label,
          options: createTypeOptions(child, parts)
        };
      }

      return { value: path, label };
    });
  }

  let typeOptions = $derived(createTypeOptions(PayloadTemplates[typeName]));
  let selectedLabel = $derived.by(() => {
    if (!value.type) return undefined;
    const shortType = value.type.split(".").at(-1)!;
    return labelMap[value.type] ?? labelMap[shortType] ?? value.type;
  });

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
  <Select
    value={value.type || null}
    options={typeOptions}
    {selectedLabel}
    placeholder={labelMap[""] ?? "유형 선택"}
    onchange={(nextType) => {
      if (nextType !== null) changeType(nextType);
    }}
  />
</div>

<style>
  .types {
    width: 100%;
  }

  .types :global(.select) {
    width: 100%;
  }
</style>
