<script>
    import Attributes from "../../Attributes.svelte";
    import { appData } from "../../../lib/syncData.svelte";
    import InputField from "../../InputField.svelte";
    import { plugins } from "../../../lib/plugins.svelte";

    const { data } = $props();

    let runtimePluginNames = $derived(
        appData.config.runtimePlugins
            .map((p) => p.name)
            .filter((p) => p && plugins.runtime?.[p]?.steps)
    );
    let runtimePluginDisplayName = $derived(
        runtimePluginNames.includes(data.payload.pluginName) ? data.payload.pluginName : null
    );
    let runtimePluginInfo = $derived(plugins.runtime?.[runtimePluginDisplayName]);
</script>

<InputField
    label="런타임 플러그인"
    value={runtimePluginDisplayName}
    setter={(d) => (data.payload.pluginName = d)}
    type="select"
    options={runtimePluginNames}
/>
<div class="step-edit-zone">
    {#if runtimePluginInfo && runtimePluginInfo.steps}
        <InputField
            label="스텝"
            value={data.payload.step}
            setter={(d) => (data.payload.step = d)}
            type="select"
            options={Object.keys(runtimePluginInfo.steps ?? {})}
        />
    {/if}
    {#if runtimePluginInfo && data.payload.step && runtimePluginInfo?.steps[data.payload.step]}
        {#key data.payload.step}
            <Attributes
                attributes={runtimePluginInfo?.steps[data.payload.step]}
                plugin={data.payload}
            />
        {/key}
    {/if}
</div>
<InputField
    label="끝날 때까지 기다리기"
    value={data.payload.waitTillEnd}
    setter={(d) => (data.payload.waitTillEnd = d)}
    type="checkbox"
/>

<style>
    .step-edit-zone {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
</style>
