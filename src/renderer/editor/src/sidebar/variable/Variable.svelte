<script>
    import Icon from "../../assets/icons/Icon.svelte";
    import InputField from "../InputField.svelte";
    import outClickAction from "../../lib/outclickaction";
    import { hoverHighlight } from "../../lib/highlight";
    import { startMonitoring } from "../../lib/runtimeMonitor.svelte";
    import { onDestroy } from "svelte";

    let { variable, isEditing, edit, blur, remove } = $props();

    let runtimeValue = $state(null);
    const unsub = startMonitoring("variables", variable.id, (v) => (runtimeValue = v));
    onDestroy(unsub);
</script>

<div
    class="variable"
    class:editing={isEditing}
    use:hoverHighlight={{ type: "variable", data: variable.id }}
>
    {#if isEditing}
        <div class="edit-zone" use:outClickAction={() => blur()}>
            <InputField
                label="변수명"
                value={variable.name}
                placeholder="이름 없는 변수"
                setter={(d) => (variable.name = d)}
                autofocus
                small
            />
            <InputField
                label="기본값"
                value={variable.defaultValue}
                setter={(d) => (variable.defaultValue = d)}
                small
            />
        </div>
    {:else}
        <div class="top">
            <div class="name">{variable.name?.length ? variable.name : "이름 없는 변수"}</div>
            <button class="icon" onclick={edit}>
                <Icon icon="edit" color="#fff" size={16} />
            </button>
            <button class="icon" onclick={remove}>
                <Icon icon="bin" color="#fff" size={16} />
            </button>
        </div>
        {#if variable.defaultValue?.length}
            <div class="value">{variable.defaultValue}</div>
        {/if}
        {#if runtimeValue && variable.defaultValue !== runtimeValue}
            <div class="runtime-value">
                {runtimeValue}
            </div>
        {/if}
    {/if}
</div>

<style>
    .variable {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 5px 7px 5px 10px;
        box-sizing: border-box;
        border-radius: 10px;
        border: solid transparent 1px;
    }
    .variable:has(> :nth-child(2)) {
        padding: 5px 5px 10px 10px;
    }
    .variable:hover {
        border-color: var(--w-o2);
    }
    .variable.editing {
        opacity: 1;
        padding: 10px;
        border-color: var(--blue-bright);
    }
    .icon {
        border-radius: 5px;
        padding: 5px;

        opacity: 0;
        cursor: pointer;
    }
    .variable:hover .icon {
        opacity: 0.5;
    }
    .icon:hover {
        background-color: var(--w-o1);
        opacity: 1 !important;
    }
    .top {
        display: flex;
        align-items: center;
    }
    .name {
        flex: 1 1 auto;
        font-weight: 600;
    }
    .icon {
        flex: 0 0 auto;
    }
    .value {
        font-style: italic;
        font-size: 14px;
        font-weight: 400;
        pointer-events: none;
        margin-left: 5px;
    }
    .edit-zone {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .runtime-value {
        margin: 3px 5px 0 5px;
        padding: 3px 5px;
        border-radius: 5px;
        background-color: rgba(247, 141, 79, 0.6);
        color: #fff;
    }
</style>
