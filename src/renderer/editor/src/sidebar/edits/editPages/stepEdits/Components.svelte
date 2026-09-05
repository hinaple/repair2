<script lang="ts">
  import { ComponentModifyInputData, ComponentModifyTypes } from "../../../../lib/translate";
  import InputField from "../../../input/InputField.svelte";
  import type { RecordEditor } from "../../../../project/mutator";
  import type { Types } from "@shared/projectData/types";
  type ComponentStep = Extract<Types.Step, { type: `Component.${string}` }>;
  const { editor }: { editor: RecordEditor<"steps"> } = $props();
  let data = $derived(editor.value as ComponentStep);
</script>

{#if data.type === "Component.create"}
  <InputField
    label="재생성 허용"
    type="checkbox"
    value={editor.at("payload", "recreate").value === "allow"}
    oncommit={(checked: boolean) => {
      editor.at("payload", "recreate").set(checked ? "allow" : "ignore");
    }}
    tippy={{
      maxWidth: 250,
      placement: "bottom",
      animation: "fade",
      content: "이미 존재하는 컴포넌트인 경우 기존 컴포넌트를 삭제하고 새로 생성합니다.",
      delay: [200, null],
      duration: 200
    }}
  />
{:else if data.type === "Component.remove"}
  <InputField label="삭제할 컴포넌트 이름" binding={editor.at("payload", "componentAlias")} />
  <InputField
    label="보호된 컴포넌트여도 제거"
    binding={editor.at("payload", "ignoreUnbreakable")}
    type="checkbox"
  />
{:else if data.type === "Component.modify"}
  <InputField label="수정할 컴포넌트 이름" binding={editor.at("payload", "componentAlias")} />
  <InputField
    label="수정할 속성"
    binding={editor.at("payload", "modifyKey")}
    type="select"
    options={ComponentModifyTypes}
  />
  {#if data.payload.modifyKey}
    <InputField
      binding={editor.at("payload", "modifyValue")}
      {...ComponentModifyInputData[data.payload.modifyKey as keyof typeof ComponentModifyInputData]}
    />
  {/if}
{:else if data.type === "Component.clear"}
  <InputField
    label="보호된 컴포넌트까지 제거"
    binding={editor.at("payload", "ignoreUnbreakable")}
    type="checkbox"
  />
{/if}
