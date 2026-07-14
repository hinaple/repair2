<script lang="ts">
  import Icon from "../../assets/icons/Icon.svelte";
  import type { FieldBinding } from "../../project/mutator";

  let {
    falseIcon,
    trueIcon,
    binding,
    onclick = null
  }: {
    falseIcon: string;
    trueIcon: string;
    binding: FieldBinding<boolean>;
    onclick?: (() => unknown) | null;
  } = $props();
  let value = $derived(binding.value);

  function clickHandler() {
    onclick?.();
    binding.set(!value);
  }
</script>

<button onclick={clickHandler} class={[value && "true"]}>
  <Icon icon={value ? trueIcon : falseIcon} size={18} color="rgba(255, 255, 255, .8)" />
</button>

<style>
  button {
    padding: 5px;
    border-radius: 5px;
    opacity: 0.7;
    flex: 0 0 auto;
    cursor: pointer;
  }
  .true {
    background-color: var(--w-o1);
  }
  button:hover {
    opacity: 1;
  }
</style>
