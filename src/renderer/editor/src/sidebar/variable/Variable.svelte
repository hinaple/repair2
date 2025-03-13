<script>
    import Icon from "../../assets/icons/Icon.svelte";
    import InputField from "../InputField.svelte";
    import outClickAction from "../../lib/outclickaction";
    import { hoverHighlight } from "../../lib/highlight";

    let { variable, isEditing, edit, blur, remove } = $props();
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
            <div class="icon" onclick={edit}>
                <Icon icon="edit" color="#fff" size={15} />
            </div>
            <div class="icon" onclick={remove}>
                <Icon icon="bin" color="#fff" size={15} />
            </div>
        </div>
        {#if variable.defaultValue?.length}
            <div class="value">{variable.defaultValue}</div>
        {/if}
    {/if}
</div>

<style>
    .variable {
        display: flex;
        gap: 5px;
        flex-direction: column;
        width: 100%;
        background-color: rgba(255, 255, 255, 0.2);
        padding: 10px;
        box-sizing: border-box;
        border-radius: 10px;
    }
    .variable.editing {
        opacity: 1;
    }
    .icon {
        opacity: 0;
        cursor: pointer;
    }
    .variable:hover .icon {
        opacity: 0.5;
    }
    .icon:hover {
        opacity: 1 !important;
    }
    .top {
        display: flex;
        align-items: center;
        gap: 10px;
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
    }
    .edit-zone {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
</style>
