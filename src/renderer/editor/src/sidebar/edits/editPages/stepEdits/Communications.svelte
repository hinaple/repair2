<script lang="ts">
  import InputField from "../../../input/InputField.svelte";
  import type { RecordEditor } from "../../../../project/mutator";
  const { editor }: { editor: RecordEditor<"steps"> } = $props();
  let parts = $derived(editor.value.type.split("."));
</script>

{#if parts[1] === "Serial"}
  {#if parts[2] === "open"}
    <InputField
      label="연결 키워드(선택)"
      binding={editor.at("payload", "portAlias")}
      placeholder="기기 이름에 포함 시 연결"
    />
    <InputField
      label="포트 번호"
      binding={editor.at("payload", "port")}
      placeholder="키워드 없을 시 연결"
    />
    <InputField
      label="통신 속도"
      binding={editor.at("payload", "baudRate")}
      type="number"
      placeholder="9600"
    />
  {:else if parts[2] === "send"}
    <InputField label="전송할 데이터" binding={editor.at("payload", "data")} type="textarea" />
  {/if}
{:else if parts[1] === "Socket"}
  {#if parts[2] === "connect"}
    <InputField
      label="URL"
      binding={editor.at("payload", "url")}
      placeholder="Enter로 구분"
      type="textarea"
    />
  {:else if parts[2] === "connectService"}
    <InputField label="서비스 종류" binding={editor.at("payload", "type")} placeholder="http" />
    <InputField
      label="서비스 이름"
      binding={editor.at("payload", "name")}
      placeholder="서비스 이름"
    />
  {:else if parts[2] === "send"}
    <InputField label="통신 채널" binding={editor.at("payload", "channel")} />
    <InputField
      label="전송할 데이터"
      type="textarea"
      seriesOption={{ binding: editor.at("payload", "data"), min: 1 }}
      autoResizeOpt={{ minHeight: 0 }}
    />
  {/if}
{:else if parts[1] === "Mqtt"}
  {#if parts[2] === "connect"}
    <InputField label="URL" binding={editor.at("payload", "url")} />
    <InputField
      label="구독할 토픽"
      seriesOption={{ binding: editor.at("payload", "topics"), min: 0 }}
    />
  {:else if parts[2] === "publish"}
    <InputField label="토픽" binding={editor.at("payload", "topic")} />
    <InputField label="전송할 메시지" binding={editor.at("payload", "payload")} />
  {/if}
{/if}
