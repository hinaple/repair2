<script>
    import { addHistory } from "../../lib/workHistory";

    let { setter, value, ...props } = $props();

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
</script>

{#if props.type === "textarea"}
    <textarea bind:value {oninput} {onfocus} {onblur} spellcheck="false" {...props}></textarea>
{:else}
    <input bind:value {oninput} {onfocus} {onblur} spellcheck="false" {...props} />
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
</style>
