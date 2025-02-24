<script>
    import { addHistory } from "../../lib/workHistory";
    import Checkbox from "./Checkbox.svelte";

    let { label = null, value, setter, type = "input", manual = false, ...props } = $props();

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

    function selectChange() {
        if (manual) {
            setter(value);
            return;
        }
        addHistory({ doFn: setter, doData: value, undoData: valueBeforeFocus });
        valueBeforeFocus = value;
    }

    function checkboxClick() {
        value = !value;
        addHistory({ doFn: setter, doData: value, undoData: !value });
    }
</script>

<div
    class={["field", type === "checkbox" && "row"]}
    onclick={() => {
        if (type === "checkbox") checkboxClick();
    }}
>
    {#if type === "checkbox"}
        <Checkbox {value} />
    {/if}
    {#if label}<div class="label">{label}</div>{/if}
    {#if type === "input"}
        <input
            type="text"
            placeholder={props.placeholder}
            bind:value
            {oninput}
            {onfocus}
            {onblur}
            spellcheck="false"
        />
    {:else if type === "textarea"}
        <textarea
            placeholder={props.placeholder}
            bind:value
            {oninput}
            {onfocus}
            {onblur}
            spellcheck="false"
        ></textarea>
    {:else if type === "select"}
        <select bind:value {onfocus} onchange={selectChange}>
            <option value={null}>선택 안함</option>
            {#each Object.entries(props.options) as [value, label]}
                <option {value}>{label}</option>
            {/each}
        </select>
    {/if}
</div>

<style>
    .field {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .field.row {
        flex-direction: row;
        align-items: center;
        gap: 5px;
        padding-left: 5px;
        box-sizing: border-box;
    }
    .label {
        font-size: 16px;
        padding-left: 5px;
    }
    input,
    select {
        padding: 2px 5px;
        border: none;
        background-color: #fff;
        font-family: "Pretend";
        font-size: 20px;
        color: #000;
        font-weight: 600;
    }
</style>
