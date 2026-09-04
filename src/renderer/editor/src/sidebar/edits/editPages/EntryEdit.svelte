<script lang="ts">
  import { EntryTypes } from "../../../lib/translate";
  import { getMutator } from "../../../project/store";
  import InputField from "../../input/InputField.svelte";
  import type { Types } from "@shared/projectData/types";
  import type { RecordEditor } from "../../../project/mutator";

  const { editor }: { editor: RecordEditor<"nodes", Types.Entry> } = $props();
  let data = $derived(editor.value);

  function setAlwaysWaiting(alwaysWaiting: boolean) {
    const standbyMode = !alwaysWaiting;
    getMutator().transaction(() => {
      editor.field("standbyMode").set(standbyMode);
      if (!standbyMode) getMutator().disconnectOutputsTo(editor.id);
    });
  }
</script>

<InputField label="진입점 이름" binding={editor.field("alias")} />
<InputField label="진입 유형" type="type" binding={editor} typeName="entry" options={EntryTypes} />
<InputField
  label="항상 대기"
  value={!data.standbyMode}
  type="checkbox"
  oncommit={setAlwaysWaiting}
/>
{#if data.type === "event"}
  <InputField label="이벤트 채널" binding={editor.at("payload", "channel")} />
{:else if data.type === "shortcut"}
  <hr />
  <InputField label="감지할 키보드 버튼" binding={editor.at("payload", "key")} />
  <InputField label="Ctrl 눌러야 감지" binding={editor.at("payload", "ctrlKey")} type="checkbox" />
  <InputField label="Alt 눌러야 감지" binding={editor.at("payload", "altKey")} type="checkbox" />
  <InputField
    label="Shift 눌러야 감지"
    binding={editor.at("payload", "shiftKey")}
    type="checkbox"
  />
  <InputField label="Win 눌러야 감지" binding={editor.at("payload", "metaKey")} type="checkbox" />
  <InputField label="감지 시간(초)" binding={editor.at("payload", "pressingTime")} type="number" />
{:else if data.type === "Communication.Socket.ondata"}
  <InputField label="수신 채널" binding={editor.at("payload", "channel")} />
  <InputField
    label="일치 시 작동할 데이터"
    binding={editor.at("payload", "data")}
    placeholder="항상 작동"
  />
{:else if data.type === "Communication.serialData"}
  <InputField
    label="수신 데이터"
    binding={editor.at("payload", "whenDataIs")}
    placeholder="모든 데이터 수신"
  />
{/if}
