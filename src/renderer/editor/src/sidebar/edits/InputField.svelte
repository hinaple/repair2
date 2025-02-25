<script>
    import { addHistory } from "../../lib/workHistory";
    import Checkbox from "./Checkbox.svelte";
    import HistoryInput from "./HistoryInput.svelte";
    import Position from "./Position.svelte";

    let { label = null, value, setter, type = "input", manual = false, ...props } = $props();

    let valueBeforeFocus;
    function onfocus() {
        valueBeforeFocus = value;
    }
    function selectChange() {
        if (manual) {
            setter(value);
            return;
        }
        addHistory({ doFn: setter, doData: value, undoData: valueBeforeFocus });
        valueBeforeFocus = value;
    }

    function typeChanged(evt) {
        value.changeTypeWithHistory(addHistory, evt.target.value);
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
    {#if type === "input" || type === "number" || type === "textarea"}
        <HistoryInput {value} {type} {setter} {...props} />
    {:else if type === "select"}
        <select bind:value {onfocus} onchange={selectChange}>
            <option value={null} hidden>선택 안함</option>
            {#each Object.entries(props.options) as [value, label]}
                <option {value}>{label}</option>
            {/each}
        </select>
    {:else if type === "type"}
        <select value={value.type} {onfocus} onchange={typeChanged}>
            <option value={null} hidden>선택 안함</option>
            {#each Object.entries(props.options) as [value, label]}
                <option {value}>{label}</option>
            {/each}
        </select>
    {:else if type === "position"}
        <Position position={value} />
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
