<script lang="ts">
  import { onMount } from "svelte";
  import { addHistory } from "../../lib/editUtils/history";
  import autoResizeTextarea from "../../lib/actions/autoResizeTextarea";
  import { setPreviewContentVisible } from "../../lib/editUtils/focus";

  let {
    setter,
    value,
    small = false,
    autofocus = false,
    code = false,
    autoResizeOpt = {},
    previewer = false,
    ...props
  } = $props();

  let valueBeforeFocus;
  let updateHistory;
  function onfocus() {
    valueBeforeFocus = value;
    if (previewer) setPreviewContentVisible(true);
  }
  function oninput() {
    if (!updateHistory) {
      updateHistory = addHistory({ doFn: setter, doData: value, undoData: valueBeforeFocus });
    } else {
      updateHistory(value);
      setter(value);
    }
  }
  function onblur() {
    updateHistory = null;
    valueBeforeFocus = null;
    if (previewer) setPreviewContentVisible(false);
  }

  let el = $state(null);

  onMount(() => {
    if (autofocus && el) el.focus();
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
