<script>
    import { appData } from "../lib/syncData.svelte";
    import { addHistory } from "../lib/workHistory";
    import Checkbox from "./Checkbox.svelte";
    import HistoryInput from "./HistoryInput.svelte";
    import PluginSelector from "./PluginSelector.svelte";
    import Position from "./Position.svelte";
    import ResourceSelector from "./ResourceSelector.svelte";
    import TypeInput from "./TypeInput.svelte";
    import TransitionInput from "./TransitionInput.svelte";

    let {
        label = null,
        value,
        setter,
        type = "input",
        manual = false,
        small = false,
        row = false,
        children = null,
        previewer = false,
        ...props
    } = $props();

    function selectChange(newData) {
        if (manual) {
            setter(newData);
            return;
        }
        addHistory({ doFn: setter, doData: newData, undoData: value });

        props.onchange?.();
    }

    function checkboxClick() {
        value = !value;
        addHistory({ doFn: setter, doData: value, undoData: !value });
    }
</script>

<div
    class={["field", (type === "checkbox" || row) && "row", small && "small"]}
    onclick={() => {
        if (type === "checkbox") checkboxClick();
    }}
>
    {#if type === "checkbox"}
        <Checkbox {value} />
    {/if}
    {#if label}<div class="label">{label}</div>{/if}
    {#if children}
        {@render children()}
    {:else if type === "input" || type === "number" || type === "textarea"}
        <HistoryInput {value} {type} {setter} {small} {previewer} {...props} />
    {:else if type === "select"}
        <select {value} onchange={(evt) => selectChange(evt.target.value)}>
            <option value={null} hidden>선택 안함</option>
            {#each Object.entries(props.options) as [value, label]}
                <option {value}>{label}</option>
            {/each}
        </select>
    {:else if type === "variable"}
        <select {value} onchange={(evt) => selectChange(evt.target.value)}>
            <option value={null}>변수 할당 없음</option>
            {#each appData.variables as variable}
                <option value={variable.id}>
                    {variable.name?.length ? variable.name : "이름 없는 변수"}
                </option>
            {/each}
        </select>
    {:else if type === "type"}
        <TypeInput type={value} {...props} />
    {:else if type === "position"}
        <Position position={value} {previewer} {...props} />
    {:else if type === "resource"}
        <ResourceSelector
            resourceId={value}
            type={props.elType}
            onchange={selectChange}
            {...props}
        />
    {:else if type === "plugin"}
        <PluginSelector plugin={value} type={props.pluginType} {...props} />
    {:else if type === "transition"}
        <TransitionInput transition={value} {...props} />
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
    .field.small {
        padding-left: 0;
    }
    .label {
        font-size: 16px;
        padding-left: 5px;
    }
    .small .label {
        font-size: 14px;
        padding: 0;
    }
    .row .label {
        flex: 0 0 auto;
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
    .row.small :global(input) {
        flex: 1 1 auto;
        width: 100%;
    }
</style>
