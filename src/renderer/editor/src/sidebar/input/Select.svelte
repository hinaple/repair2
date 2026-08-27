<script lang="ts" generics="T extends null | string | number | boolean">
  import { genId } from "@shared/genId";
  import Icon from "../../assets/icons/Icon.svelte";
  import SelectOptions from "../../lib/menu/Menu.svelte";
  import { onMount } from "svelte";

  interface Option {
    value: T;
    label?: string;
  }

  let {
    value = $bindable(null),
    options = [],
    placeholder = "",
    autofocus = false,
    onchange,
    unselectable = false
  }: {
    value?: T | null;
    options: (T | Option | [T, string])[];
    placeholder?: string;
    autofocus?: boolean;
    unselectable?: boolean;
    onchange?: (v: T | null) => unknown;
  } = $props();

  let labelMap = $derived<Map<T, string>>(
    new Map(
      options.length > 0 && Array.isArray(options[0])
        ? (options as [T, string][])
        : (options as (T | Option)[]).map((o) =>
            o && typeof o === "object" ? [o.value, o.label ?? String(o.value)] : [o, String(o)]
          )
    )
  );

  let currentLabel = $derived(value === null ? placeholder : (labelMap.get(value) ?? placeholder));

  let expanded = $state(false);

  function toggle() {
    expanded = !expanded;
  }
  function collapse() {
    expanded = false;
  }

  const anchorName = `--select-${genId()}`;

  let btnEl: HTMLButtonElement | undefined = $state();

  function select(v: T | null) {
    if (v === value) return;

    value = v;
    onchange?.(v);
    collapse();
  }

  function onkeydown(evt: KeyboardEvent) {
    if (expanded || (evt.key !== "ArrowUp" && evt.key !== "ArrowDown")) return;

    expanded = true;
    evt.stopImmediatePropagation();
  }

  onMount(() => {
    if (autofocus) {
      btnEl!.focus();
      expanded = true;
    }
  });
</script>

<button
  bind:this={btnEl}
  class="select"
  onclick={toggle}
  onblur={collapse}
  style={`--a: ${anchorName};`}
  {onkeydown}
>
  <div class="label">
    {currentLabel}
  </div>
  <Icon icon="triangle" color="#fff" size={10} />
</button>
{#if expanded}
  <SelectOptions
    {value}
    parents={[btnEl]}
    {select}
    {unselectable}
    {labelMap}
    {anchorName}
    {placeholder}
    {collapse}
  />
{/if}

<style>
  .select {
    text-align: left;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    anchor-name: var(--a);

    .label {
      flex: 1 1 auto;
      overflow: hidden;
    }
  }
</style>
