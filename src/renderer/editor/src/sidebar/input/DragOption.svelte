<script lang="ts">
  import * as Easings from "easing-utils";
  import { createCoord, createDragOption } from "@shared/projectData/factories";
  import type { FieldBinding } from "../../project/mutator";
  import InputField from "./InputField.svelte";

  let { binding, previewer = false }: { binding: FieldBinding<any>; previewer?: boolean } =
    $props();
  let dragOption = $derived(binding.value);

  function toggleUse(use: boolean) {
    binding.set(createDragOption({ ...(use ? dragOption : {}), use }));
  }
</script>

<InputField label="드래그 사용" value={!!dragOption.use} type="checkbox" oncommit={toggleUse} />
{#if dragOption.use}
  <InputField label="놓으면 위치 복귀" binding={binding.at("returnOnRelease")} type="checkbox" />
  {#if dragOption.returnOnRelease}
    <InputField
      label="복귀 시간(ms)"
      type="number"
      placeholder="0"
      binding={binding.at("returnDuration")}
    />
  {/if}
  <InputField
    label="인식 허용치(px)"
    type="number"
    placeholder="0"
    binding={binding.at("threshold")}
  />
  <InputField
    label="스냅"
    type="select"
    options={{ never: "없음", drag: "드래그 도중", release: "놓았을 때" }}
    binding={binding.at("snapOn")}
  />
  {#if dragOption.snapOn !== "never"}
    <InputField
      label="스냅 시간(ms)"
      type="number"
      placeholder="0"
      binding={binding.at("snapDuration")}
    />
  {/if}
  <InputField
    label="easing"
    placeholder="ease"
    type="select"
    options={Object.keys(Easings)}
    binding={binding.at("moveEasing")}
  />
  <InputField
    label="인식 좌표"
    type="position"
    style="padding: 5px 5px 10px 10px; border-radius: 5px; border: solid rgba(255, 255, 255, .2) 1px;"
    seriesOption={{
      binding: binding.at<ReturnType<typeof createCoord>[]>("hotspots"),
      label: (idx: number) => `좌표${idx}`,
      newData: createCoord
    }}
    {previewer}
  />
{/if}
