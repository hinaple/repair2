<script lang="ts">
  import InputField from "../../input/InputField.svelte";
  import type { Types } from "@shared/projectData/types";
  import type { RecordEditor } from "../../../project/mutator";

  const { editor }: { editor: RecordEditor<"nodes", Types.VariableSet> } = $props();
</script>

<InputField label="노드 이름" binding={editor.field("alias")} />
<InputField label="설정할 변수" binding={editor.field("variable")} type="variable" />
