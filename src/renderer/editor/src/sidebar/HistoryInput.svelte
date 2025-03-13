<script>
    import { onMount } from "svelte";
    import { addHistory } from "../lib/workHistory";

    let { setter, value, small = false, autofocus = false, ...props } = $props();

    let valueBeforeFocus;
    let updateHistory;
    function onfocus() {
        valueBeforeFocus = value;
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
    }

    let el = $state(null);

    onMount(() => {
        if (autofocus && el) el.focus();
    });
</script>

{#if props.type === "textarea"}
    <textarea
        class:small
        bind:value
        bind:this={el}
        {oninput}
        {onfocus}
        {onblur}
        spellcheck="false"
        {...props}
    ></textarea>
{:else}
    <input
        class:small
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
    input {
        padding: 2px 5px;
        border: none;
        background-color: #fff;
        font-family: "Pretend";
        font-size: 20px;
        color: #000;
        font-weight: 600;
        box-sizing: border-box;
    }
    .small {
        font-size: 16px;
    }
</style>
