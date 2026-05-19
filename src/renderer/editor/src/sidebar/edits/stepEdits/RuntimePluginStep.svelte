<script>
    import Attributes from "../../Attributes.svelte";
    import { appData } from "../../../lib/syncData.svelte";
    import InputField from "../../InputField.svelte";

    const { data } = $props();

    let runtimePluginNames = $derived(
        appData.config.runtimePlugins.map((p) => p.name).filter((p) => p)
    );
    let runtimePluginDisplayName = $derived(
        runtimePluginNames.includes(data.payload.pluginName) ? data.payload.pluginName : null
    );
    let runtimePluginPointer = $derived(
        runtimePluginDisplayName
            ? appData.config.runtimePlugins.find((p) => p.name === runtimePluginDisplayName)
            : null
    );
</script>

<InputField
    label="런타임 플러그인"
    value={runtimePluginDisplayName}
    setter={(d) => (data.payload.pluginName = d)}
    type="select"
    options={Object.fromEntries(runtimePluginNames.map((p) => [p, p.replace(/\.js$/, "")]))}
/>
<div class="step-edit-zone">
    {#if runtimePluginPointer}
        <InputField
            label="스텝"
            value={data.payload.step}
            setter={(d) => (data.payload.step = d)}
            type="select"
            options={runtimePluginPointer?.steps ?? []}
        />
    {/if}
    {#if runtimePluginPointer && data.payload.step}
        {#key data.payload.step}
            <Attributes
                attributes={runtimePluginPointer.getStepAttributes?.(data.payload.step)}
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
    }
</style>
