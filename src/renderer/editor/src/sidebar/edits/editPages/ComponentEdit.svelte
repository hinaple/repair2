<script lang="ts">
  import InputField from "../../input/InputField.svelte";
  import ToggleZone from "../../input/ToggleZone.svelte";
  import { reloadPreview } from "../../../lib/editUtils/preview";
  import Toggles from "../../input/Toggles.svelte";
  import type { RecordEditor } from "../../../project/mutator";

  const { editor }: { editor: RecordEditor<"components"> } = $props();
  let data = $derived(editor.value);
</script>

<InputField
  label="컴포넌트 이름"
  binding={editor.field("alias")}
  placeholder="이름 없는 컴포넌트"
/>
<Toggles
  toggles={[
    {
      trueIcon: "locked",
      falseIcon: "unlocked",
      binding: editor.field("unbreakable")
    },
    {
      trueIcon: "visible",
      falseIcon: "invisible",
      binding: editor.field("visible")
    }
  ]}
  style="margin-block: -8px;"
/>
<hr />
<InputField
  label="위치"
  binding={editor.field("pos")}
  type="position"
  previewer
  oninput={reloadPreview}
/>
<InputField
  label="Z축 위치"
  binding={editor.field("zIndex")}
  type="number"
  placeholder="값이 클수록 앞에 보임"
/>
<InputField
  label="CSS 코드"
  binding={editor.field("style")}
  type="textarea"
  code
  oninput={reloadPreview}
  placeholder="inline CSS code"
  autoResizeOpt={{ minHeight: 50 }}
/>
<InputField label="프레임" binding={editor.field("frame")} type="plugin" pluginType="frame" />
<hr />
<ToggleZone label="트랜지션 설정">
  <InputField label="인트로" binding={editor.field("introTransition")} type="transition" />
  <InputField label="아웃트로" binding={editor.field("outroTransition")} type="transition" />
</ToggleZone>
