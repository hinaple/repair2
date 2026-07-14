<script lang="ts">
  import { onMount } from "svelte";
  import type { EditSession, FieldBinding } from "../../project/mutator";
  import autoResizeTextarea from "../../lib/actions/autoResizeTextarea";

  let {
    binding,
    small = false,
    autofocus = false,
    code = false,
    autoResizeOpt = { minHeight: 0 },
    previewer = false,
    onpreview = null,
    ...props
  }: {
    binding: FieldBinding<any>;
    small?: boolean;
    autofocus?: boolean;
    code?: boolean;
    autoResizeOpt?: { minHeight: number };
    previewer?: boolean;
    onpreview?: (() => unknown) | null;
    [key: string]: any;
  } = $props();

  let value = $state<any>(binding.value ?? "");
  let focused = false;
  let session: EditSession<any> | null = null;

  $effect(() => {
    const next = binding.value;
    if (!focused && !Object.is(value, next)) value = next ?? "";
  });

  function modelValue() {
    if (props.type !== "number") return value;
    return value === "" || value === null ? null : Number(value);
  }

  function onfocus() {
    focused = true;
    session = binding.begin();
  }

  function oninput() {
    const next = modelValue();
    if (session) session.update(next);
    else {
      session = binding.begin();
      session.update(next);
    }
    onpreview?.();
  }

  function onblur() {
    session?.commit();
    session = null;
    focused = false;
  }

  let el = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);
  onMount(() => {
    if (autofocus) el?.focus();
  });
</script>

{#if props.type === "textarea"}
  <textarea
    class:small
    class:code
    bind:value
    bind:this={el}
    {oninput}
    {onfocus}
    {onblur}
    spellcheck="false"
    use:autoResizeTextarea={autoResizeOpt}
    {...props}
  ></textarea>
{:else}
  <input
    class:small
    class:code
    bind:value
    bind:this={el}
    {oninput}
    {onfocus}
    {onblur}
    spellcheck="false"
    {...props}
  />
{/if}

<style>
  textarea {
    width: 100%;
  }
</style>
