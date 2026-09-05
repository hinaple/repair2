<script lang="ts">
  import InputField from "../../input/InputField.svelte";
  import type { Types } from "@shared/projectData/types";
  import type { RecordEditor } from "../../../project/mutator";

  const { editor }: { editor: RecordEditor<"nodes", Types.Sequence> } = $props();
</script>

<InputField label="시퀀스 이름" binding={editor.field("alias")} placeholder="이름 없는 시퀀스" />
<hr />

<InputField
  label="동시 실행 허용"
  type="checkbox"
  value={editor.field("concurrency").value === "allow"}
  oncommit={(checked: boolean) => {
    editor.field("concurrency").set(checked ? "allow" : "skip");
  }}
  tippy={{
    maxWidth: 250,
    placement: "bottom",
    animation: "fade",
    content: "아직 실행 중인 스텝이 있는 경우 동시 실행을 허용합니다.",
    delay: [200, null],
    duration: 200
  }}
/>
