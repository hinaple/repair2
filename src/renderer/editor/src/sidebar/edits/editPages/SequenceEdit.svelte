<script lang="ts">
  import InputField from "../../input/InputField.svelte";
  import type { Types } from "@shared/projectData/types";
  import type { RecordEditor } from "../../../project/mutator";

  const { editor }: { editor: RecordEditor<"nodes", Types.Sequence> } = $props();
</script>

<InputField label="시퀀스 이름" binding={editor.field("alias")} placeholder="이름 없는 시퀀스" />
