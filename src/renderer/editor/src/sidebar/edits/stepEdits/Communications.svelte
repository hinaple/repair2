<script>
    import InputField from "../../InputField.svelte";

    const { data } = $props();
</script>

{#if data.types[1] === "Serial"}
    {#if data.types[2] === "open"}
        <InputField
            label="연결 키워드(선택)"
            value={data.payload.portAlias}
            setter={(d) => (data.payload.portAlias = d)}
            placeholder="기기 이름에 포함 시 연결"
        />
        <InputField
            label="포트 번호"
            value={data.payload.port}
            setter={(d) => (data.payload.port = d)}
            placeholder="키워드 없을 시 연결"
        />
        <InputField
            label="통신 속도"
            value={data.payload.baudRate}
            setter={(d) => (data.payload.baudRate = d)}
            placeholder="9600"
        />
    {:else if data.types[2] === "send"}
        <InputField
            label="전송할 데이터"
            value={data.payload.data}
            setter={(d) => (data.payload.data = d)}
            type="textarea"
        />
    {/if}
{:else if data.types[1] === "Socket"}
    {#if data.types[2] === "connect"}
        <InputField
            label="URL"
            value={data.payload.url}
            setter={(d) => (data.payload.url = d)}
            placeholder="http://127.0.0.1:3000"
        />
    {:else if data.types[2] === "send"}
        <InputField
            label="통신 채널"
            value={data.payload.channel}
            setter={(d) => (data.payload.channel = d)}
        />
        <InputField
            label="전송할 데이터"
            value={data.payload.data}
            setter={(d) => (data.payload.data = d)}
            type="textarea"
        />
    {/if}
{/if}
