<script>
    import InputField from "../InputField.svelte";
    import { EntryTypes } from "../../lib/translate";

    const { data } = $props();
</script>

<InputField label="진입점 이름" value={data.alias} setter={(d) => (data.alias = d)} />
<InputField
    label="진입 유형"
    value={data.entryType}
    setter={(d) => (data.entryType = d)}
    type="select"
    options={EntryTypes}
/>
{#if data.entryType === "event"}
    <InputField label="이벤트 채널" value={data.channel} setter={(d) => (data.channel = d)} />
{/if}
