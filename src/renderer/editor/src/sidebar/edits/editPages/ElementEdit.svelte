<script lang="ts">
  import { ElementTypes, InputAllowedTypes } from "../../../lib/translate";
  import InputField from "../../input/InputField.svelte";
  import Position from "../../input/Position.svelte";
  import { reloadPreview } from "../../../lib/editUtils/preview";
  import DragOption from "../../input/DragOption.svelte";
  import type { RecordEditor } from "../../../project/mutator";

  const { editor }: { editor: RecordEditor<"elements"> } = $props();
  let data = $derived(editor.value);
</script>

<InputField label="요소 이름" binding={editor.field("alias")} />
<InputField
  label="요소 종류"
  binding={editor}
  type="type"
  typeName="element"
  options={ElementTypes}
/>
<hr />
{#if data.type === "image" || data.type === "video"}
  <InputField
    label="자원 선택"
    binding={editor.at("payload", "resourceId")}
    type="resource"
    elType={data.type}
  />
  <InputField
    label="생성 후 프리로드 제거"
    binding={editor.at("payload", "removePreload")}
    type="checkbox"
  />
{/if}
{#if data.type === "input"}
  <InputField
    label="생성 시 자동 선택"
    binding={editor.at("payload", "autofocus")}
    type="checkbox"
  />
  <InputField label="큰 입력칸" binding={editor.at("payload", "isTextarea")} type="checkbox" />
  <InputField label="변수 할당" binding={editor.at("payload", "variableId")} type="variable" />
  <InputField label="플레이스홀더" binding={editor.at("payload", "placeholder")} />
  <InputField
    label="글자 최대 길이"
    type="number"
    binding={editor.at("payload", "maxLength")}
    placeholder="제한 없음"
  />
  <InputField
    label="입력 유형"
    binding={editor.at("payload", "allowedType")}
    type="select"
    options={InputAllowedTypes}
  />
  {#if data.payload.allowedType === "regex"}
    <InputField
      label="정규표현식"
      binding={editor.at("payload", "allowedRegex")}
      placeholder="허용할 문자열 정규표현식"
    />
  {/if}
  <InputField
    label="문자열 변형 함수"
    binding={editor.at("payload", "valueFunction")}
    type="textarea"
    code
    autoResizeOpt={{ minHeight: 50 }}
    placeholder="return value;"
  />
{:else if data.type === "advancedInput"}
  <InputField label="변수 할당" binding={editor.at("payload", "variableId")} type="variable" />
  <InputField
    label="글자 최대 길이"
    type="number"
    binding={editor.at("payload", "maxLength")}
    placeholder="제한 없음"
  />
  <InputField
    label="가림 문자"
    binding={editor.at("payload", "securityText")}
    maxLength={1}
    placeholder="가림 없음"
  />
{:else if data.type === "video"}
  <InputField label="반복 재생" binding={editor.at("payload", "loop")} type="checkbox" />
  <InputField
    label="음량"
    binding={editor.at("payload", "volume")}
    type="number"
    placeholder="0-100 사이의 실수"
    min="0"
    max="100"
  />
{:else if data.type === "empty"}
  <InputField
    label="내용"
    type="textarea"
    code={data.payload.isHtml}
    placeholder={data.payload.isHtml ? "HTML code" : "문자열"}
    autoResizeOpt={{ minHeight: 50 }}
    binding={editor.at("payload", "content")}
  />
  <InputField label="HTML로 렌더링" binding={editor.at("payload", "isHtml")} type="checkbox" />
{:else if data.type === "plugin"}
  <InputField
    label="플러그인"
    binding={editor.at("payload", "plugin")}
    type="plugin"
    pluginType="element"
    canUnselect={false}
  />
{/if}
<hr />
<InputField
  label="전체화면"
  binding={editor.field("fullscreen")}
  type="checkbox"
  onchange={reloadPreview}
/>
{#if !data.fullscreen}
  <InputField
    label="위치 지정"
    binding={editor.field("absolute")}
    type="checkbox"
    onchange={reloadPreview}
    previewer
  />
  {#if data.absolute}
    <Position binding={editor.field("pos")} oninput={reloadPreview} previewer />
    <hr />
  {/if}
  <InputField
    label="가로 크기(px)"
    type="number"
    placeholder="자동"
    binding={editor.field("width")}
    oninput={reloadPreview}
    previewer
  />
  <InputField
    label="세로 크기(px)"
    type="number"
    placeholder="자동"
    binding={editor.field("height")}
    oninput={reloadPreview}
    previewer
  />
{/if}
<hr />
<InputField
  label="CSS 클래스명"
  binding={editor.field("className")}
  oninput={reloadPreview}
  placeholder="띄어쓰기로 구분"
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
<InputField
  label="내부 CSS 코드"
  binding={editor.field("childStyle")}
  type="textarea"
  code
  placeholder="inline CSS code"
  autoResizeOpt={{ minHeight: 50 }}
/>
<hr />
{#if !data.fullscreen}
  <DragOption binding={editor.field("dragOption")} />
{/if}
