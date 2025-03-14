<script>
    import { onMount } from "svelte";
    import { addHistory } from "../lib/workHistory";
    import autoResizeTextarea from "../lib/autoResizeTextarea";

    let {
        setter,
        value,
        small = false,
        autofocus = false,
        code = false,
        autoResizeOpt = {},
        ...props
    } = $props();

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
    input,
    textarea {
        padding: 2px 5px;
        border: none;
        background-color: #fff;
        font-family: "Pretend";
        font-size: 20px;
        color: #000;
        font-weight: 600;
        box-sizing: border-box;
    }
    textarea {
        resize: none;
    }
    .small {
        font-size: 16px;
    }
    .code {
        font-family: "Consolas";
        font-size: 16px;
        background-color: #2b002a;
        color: #fff;
        font-weight: 400;
        border: solid #b974b9 1px;
    }
</style>
