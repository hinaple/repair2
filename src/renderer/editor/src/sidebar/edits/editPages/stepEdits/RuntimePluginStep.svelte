<script lang="ts">
  import { plugins } from "../../../../lib/plugins.svelte";
  import { getMutator, getProject } from "../../../../project/store";
  import Attributes from "../../../input/Attributes.svelte";
  import InputField from "../../../input/InputField.svelte";
  import type { RecordEditor } from "../../../../project/mutator";
  import type { Types } from "@shared/projectData/types";

  const { editor }: { editor: RecordEditor<"steps"> } = $props();
  let data = $derived(editor.value as Extract<Types.Step, { type: "Others.runtimePluginStep" }>);
  let runtimePluginIds = $derived(getMutator().config().field("runtimePlugins").value);
  let runtimePluginNames = $derived(
    runtimePluginIds
      .map((id) => (id ? getProject().pluginPointers.get(id)?.name : null))
      .filter((name): name is string => !!name && !!plugins.runtime?.[name]?.steps)
  );
  let runtimePluginDisplayName = $derived(
    data.payload.pluginName && runtimePluginNames.includes(data.payload.pluginName)
      ? data.payload.pluginName
      : null
  );
  let runtimePluginInfo = $derived(
    runtimePluginDisplayName ? plugins.runtime?.[runtimePluginDisplayName] : null
  );
</script>

<InputField
  label="런타임 플러그인"
  binding={editor.at("payload", "pluginName")}
  type="select"
  options={runtimePluginNames}
/>
<div class="step-edit-zone">
  {#if runtimePluginInfo?.steps}
    <InputField
      label="스텝"
      binding={editor.at("payload", "step")}
      type="select"
      options={Object.keys(runtimePluginInfo.steps)}
    />
  {/if}
  {#if runtimePluginInfo && data.payload.step && runtimePluginInfo.steps?.[data.payload.step]}
    {#key data.payload.step}
      <Attributes
        attributes={runtimePluginInfo.steps[data.payload.step] ?? []}
        binding={editor.at("payload", "payloads")}
      />
    {/key}
  {/if}
</div>
<InputField
  label="끝날 때까지 기다리기"
  binding={editor.at("payload", "waitTillEnd")}
  type="checkbox"
/>

<style>
  .step-edit-zone {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
</style>
