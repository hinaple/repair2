<script>
    import InputField from "../../InputField.svelte";

    const { data } = $props();
</script>

{#if data.types[1]}
    <InputField
        label="채널명"
        value={data.payload.channel}
        setter={(d) => (data.payload.channel = d)}
        placeholder="default"
    />
{/if}

{#if data.types[1] === "play"}
    <InputField
        label="재생할 오디오 자원"
        value={data.payload.resourceId}
        setter={(d) => (data.payload.resourceId = d)}
        type="resource"
        elType="audio"
    />
    <InputField
        label="반복 재생"
        value={data.payload.loop}
        setter={(d) => (data.payload.loop = d)}
        type="checkbox"
    />
    <InputField
        label="음량"
        value={data.payload.volume}
        setter={(d) => (data.payload.volume = d)}
        type="number"
        placeholder="0-100"
        min="0"
        max="100"
    />
{:else if data.types[1] === "changeVolume"}
    <InputField
        label="변경할 음량"
        value={data.payload.volume}
        setter={(d) => (data.payload.volume = d)}
        type="number"
        placeholder="0-100"
        min="0"
        max="100"
    />
    <InputField
        label="변화 시간(초)"
        value={data.payload.duration}
        setter={(d) => (data.payload.duration = d)}
        type="number"
        min="0"
    />
{/if}
