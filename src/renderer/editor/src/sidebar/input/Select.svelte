<script lang="ts" generics="T extends string | number | boolean">
  import { genId } from "@shared/genId";
  import type { MenuItem } from "../../lib/menu/menu.types";
  import Menu from "../../lib/menu/Menu.svelte";
  import Icon from "../../assets/icons/Icon.svelte";
  import { onMount } from "svelte";

  type ValueOption = {
    value: T;
    label?: string;
    disabled?: boolean;
  };

  type SubmenuOption = {
    type: "submenu";
    label: string;
    options: readonly SelectOption[];
    disabled?: boolean;
  };

  type SelectOption = T | ValueOption | readonly [T, string] | SubmenuOption;

  type NormalizedOption =
    | {
        type: "option";
        value: T;
        label: string;
        disabled?: boolean;
      }
    | {
        type: "submenu";
        label: string;
        options: readonly NormalizedOption[];
        disabled?: boolean;
      };

  let {
    value = $bindable(null),
    options = [],
    placeholder = "",
    selectedLabel = undefined,
    autofocus = false,
    onchange,
    unselectable = false
  }: {
    value?: T | null;
    options: readonly SelectOption[];
    placeholder?: string;
    selectedLabel?: string;
    autofocus?: boolean;
    unselectable?: boolean;
    onchange?: (value: T | null) => unknown;
  } = $props();

  function normalizeOption(option: SelectOption): NormalizedOption {
    if (Array.isArray(option)) {
      const [optionValue, label] = option as readonly [T, string];
      return { type: "option", value: optionValue, label };
    }

    if (typeof option === "object") {
      const optionObject = option as ValueOption | SubmenuOption;
      if (!("value" in optionObject)) {
        return {
          type: "submenu",
          label: optionObject.label,
          disabled: optionObject.disabled,
          options: optionObject.options.map(normalizeOption)
        };
      }

      return {
        type: "option",
        value: optionObject.value,
        label: optionObject.label ?? String(optionObject.value),
        disabled: optionObject.disabled
      };
    }

    return { type: "option", value: option, label: String(option) };
  }

  let normalizedOptions = $derived(options.map(normalizeOption));

  function findOption(
    levelOptions: readonly NormalizedOption[],
    selected: T
  ): Extract<NormalizedOption, { type: "option" }> | undefined {
    for (const option of levelOptions) {
      if (option.type === "submenu") {
        const found = findOption(option.options, selected);
        if (found) return found;
      } else if (Object.is(option.value, selected)) return option;
    }
    return undefined;
  }

  let currentLabel = $derived(
    value === null
      ? placeholder
      : (selectedLabel ?? findOption(normalizedOptions, value)?.label ?? placeholder)
  );

  let expanded = $state(false);

  function toggle() {
    expanded = !expanded;
  }

  function collapse() {
    expanded = false;
  }

  const anchorName = `--select-${genId()}`;

  let btnEl: HTMLButtonElement | undefined = $state();

  function select(nextValue: T | null) {
    if (!Object.is(nextValue, value)) {
      value = nextValue;
      onchange?.(nextValue);
    }
    collapse();
  }

  function toMenuItems(levelOptions: readonly NormalizedOption[]): MenuItem[] {
    return levelOptions.map((option): MenuItem => {
      if (option.type === "submenu") {
        return {
          type: "submenu",
          label: option.label,
          disabled: option.disabled,
          items: toMenuItems(option.options)
        };
      }

      return {
        type: "radio",
        label: option.label,
        disabled: option.disabled,
        checked: Object.is(value, option.value),
        activate: () => select(option.value)
      };
    });
  }

  let menuItems = $derived.by((): MenuItem[] => {
    const result = toMenuItems(normalizedOptions);
    if (unselectable) {
      result.unshift({
        type: "radio",
        label: placeholder,
        checked: value === null,
        activate: () => select(null)
      });
    }
    return result;
  });

  function onkeydown(event: KeyboardEvent) {
    if (expanded || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;

    expanded = true;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  onMount(() => {
    if (autofocus) {
      btnEl?.focus();
      expanded = true;
    }
  });
</script>

<button
  bind:this={btnEl}
  type="button"
  class="select"
  onclick={toggle}
  onblur={collapse}
  style={`--a: ${anchorName};`}
  aria-haspopup="menu"
  aria-expanded={expanded}
  {onkeydown}
>
  <div class="label">
    {currentLabel}
  </div>
  <Icon icon="triangle" color="#fff" size={10} />
</button>
{#if expanded}
  <Menu items={menuItems} parents={btnEl ? [btnEl] : []} {anchorName} {collapse} />
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
