<script lang="ts">
  import { getProject } from "../../project/store";
  import type { ArrayFieldBinding, FieldBinding } from "../../project/mutator";
  import InputField from "./InputField.svelte";
  import Checkbox from "./Checkbox.svelte";
  import HistoryInput from "./HistoryInput.svelte";
  import PluginSelector from "./PluginSelector.svelte";
  import Position from "./Position.svelte";
  import ResourceSelector from "./ResourceSelector.svelte";
  import TypeInput from "./TypeInput.svelte";
  import TransitionInput from "./TransitionInput.svelte";
  import Icon from "../../assets/icons/Icon.svelte";
  import Select from "./Select.svelte";

  type SeriesOption = {
    binding: ArrayFieldBinding<any>;
    gap?: number;
    min?: number;
    max?: number;
    label?: (index: number) => string | null;
    create?: () => unknown;
    newData?: () => any;
  };

  let {
    label = null,
    value: legacyValue = undefined,
    binding = null,
    type = "input",
    small = false,
    row = false,
    children = null,
    previewer = false,
    oninput = null,
    oninputremove = null,
    background = false,
    seriesOption = null,
    style = null,
    ...props
  }: {
    binding?: FieldBinding<any> | null;
    value?: any;
    seriesOption?: SeriesOption | null;
    [key: string]: any;
  } = $props();

  let value = $derived(binding ? binding.value : legacyValue);

  function selectChange(newData: any) {
    if (props.oncommit) {
      props.oncommit(newData);
      props.onchange?.();
      return;
    }
    binding?.set(newData);

    props.onchange?.();
  }

  function checkboxClick() {
    if (props.oncommit) {
      props.oncommit(!value);
      props.onchange?.();
      return;
    }
    binding?.set(!value);
    props.onchange?.();
  }
</script>

<div
  class={[
    "field",
    ...(seriesOption
      ? []
      : [
          type === "checkbox" && "end",
          (type === "checkbox" || row) && "row",
          small && "small",
          background && "background"
        ])
  ]}
  style={seriesOption ? null : style}
  onclick={() => {
    if (type === "checkbox") checkboxClick();
  }}
>
  {#if label || oninputremove}
    <div class="label">
      <span>{label}</span>
      {#if oninputremove}
        <button class="remove" onclick={oninputremove}>
          <Icon icon="close" color="#fff" size={12} lineWidth={1.5} />
        </button>
      {/if}
    </div>
  {/if}
  {#if seriesOption?.binding}
    {@const seriesBinding = seriesOption.binding}
    {@const array = seriesBinding.value}
    <div class="series-container" style={`gap: ${seriesOption.gap ?? 5}px;`}>
      {#each array as v, i}
        {@const canRemoveNow = (seriesOption.min ?? 0) <= i}
        {@const remove = () => {
          seriesBinding.splice(i, 1);
        }}
        <div class="series-field">
          <InputField
            binding={seriesBinding.at(i)}
            label={seriesOption?.label?.(i) ?? null}
            {type}
            {small}
            {row}
            {children}
            {previewer}
            {oninput}
            {oninputremove}
            {background}
            {style}
            {...type === "resource" && canRemoveNow ? { removable: true, onremove: remove } : {}}
            {...type === "position" && canRemoveNow ? { oninputremove: remove } : {}}
            {...props}
          />
          {#if type !== "resource" && type !== "position" && canRemoveNow}
            <button class="remove small" onclick={remove}>
              <Icon icon="close" color="#fff" lineWidth={2} size={10} />
            </button>
          {/if}
        </div>
      {/each}
      {#if (seriesOption.max ?? Infinity) > array.length}
        <button
          class="plus"
          onclick={() => {
            if (seriesOption.create) {
              seriesOption.create();
              return;
            }
            const newData = seriesOption.newData?.() ?? null;
            seriesBinding.splice(array.length, 0, newData);
          }}
        >
          <Icon icon="plus" color="#fff" size={13} lineWidth={1} />
          추가
        </button>
      {/if}
    </div>
  {:else if children}
    {@render children()}
  {:else if type === "checkbox"}
    <Checkbox {value} />
  {:else if type === "input" || type === "number" || type === "textarea"}
    {#if binding}<HistoryInput
        {binding}
        {type}
        {small}
        {previewer}
        onpreview={oninput}
        {...props}
      />{/if}
  {:else if type === "select"}
    <Select
      {value}
      onchange={(v) => selectChange(v ?? null)}
      options={Array.isArray(props.options)
        ? props.options
        : Object.entries(props.options).map(([v, l]) => ({ value: v, label: l }))}
      placeholder="선택 안함"
      unselectable={props.canUnselect}
    />
  {:else if type === "variable"}
    <select {value} onchange={(evt) => selectChange(evt.currentTarget.value || null)}>
      <option value={null}>변수 할당 없음</option>
      {#each getProject().variables.values() as variable}
        <option value={variable.id}>
          {variable.name?.length ? variable.name : "이름 없는 변수"}
        </option>
      {/each}
    </select>
  {:else if type === "type" && binding}
    <TypeInput
      {binding}
      typeName={props.typeName}
      options={props.options}
      onchange={props.onchange}
    />
  {:else if type === "position" && binding}
    <Position {binding} {previewer} {oninput} {...props} />
  {:else if type === "resource"}
    <ResourceSelector resourceId={value} type={props.elType} onchange={selectChange} {...props} />
  {:else if type === "plugin" && binding}
    <PluginSelector {binding} type={props.pluginType} canUnselect={props.canUnselect} />
  {:else if type === "transition" && binding}
    <TransitionInput {binding} />
  {/if}
</div>

<style>
  .field {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-sizing: border-box;
  }
  .field.background {
    background-color: var(--w-o2);
  }
  .field.row {
    flex-direction: row;
    gap: 5px;
    padding-left: 5px;
    box-sizing: border-box;
    align-items: center;
  }
  .field.end {
    justify-content: end;
    padding-right: 10px;
    gap: 10px;
  }
  .field.small {
    padding-left: 0;
  }
  .label {
    opacity: 0.8;
    font-size: 14px;
    padding-left: 3px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .small .label {
    font-size: 14px;
    padding: 0;
  }
  .row .label {
    opacity: 1;
    flex: 0 0 auto;
  }
  .series-container {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .series-field {
    display: flex;
    flex-direction: row;
    gap: 2px;
  }
  .plus {
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: var(--w-o2);
    border: solid transparent 1px;
    margin: 0;
    padding: 5px 8px;
    gap: 5px;
    color: #fff;
    box-sizing: border-box;
    font-size: 16px;
    cursor: pointer;

    transition: border-color 200ms;
  }
  .plus:hover {
    border-color: #fff;
  }
  .row.small :global(input) {
    flex: 1 1 auto;
    width: 100%;
  }

  .remove {
    background: none;
    border: none;
    cursor: pointer;
    height: 27px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    corner-shape: squircle;
    padding: 0;
    opacity: 0.6;
  }
  .remove.small {
    flex: 0 0 auto;
    width: 20px;
    height: 100%;
    max-height: 27px;
  }
  .remove:hover {
    opacity: 1;
    background-color: var(--w-o1);
  }
</style>
