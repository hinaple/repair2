<script>
    import InputField from "./InputField.svelte";
    import PluginSelector from "./PluginSelector.svelte";

    let { transition } = $props();
</script>

<div class="transition-input">
    <PluginSelector plugin={transition.plugin} type="transitions" pluginType="transitions" />
    {#if transition.plugin.name}
        <InputField
            label="지속시간(ms)"
            value={transition.duration}
            type="number"
            setter={(d) => (transition.duration = d)}
            placeholder={400}
            row
            small
        />
        <InputField
            label="딜레이(ms)"
            value={transition.delay}
            type="number"
            setter={(d) => (transition.delay = d)}
            placeholder={0}
            row
            small
        />
        <InputField
            label="easing"
            value={transition.easing}
            setter={(d) => (transition.easing = d)}
            placeholder="linear"
            row
            small
        />
    {/if}
</div>

<style>
    .transition-input {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-bottom: 10px;
    }
</style>
