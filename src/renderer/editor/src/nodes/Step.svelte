<script>
    import { get } from "svelte/store";
    import Icon from "../assets/icons/Icon.svelte";
    import { currentFocus, focusData } from "../sidebar/editUtils";
    import { grabbing } from "../lib/stores";
    import { StepTypes } from "../lib/translate";
    import Component from "./component/Component.svelte";
    import { outClicked, rightclick } from "../lib/contextMenu/contextUtils";
    import { onDestroy } from "svelte";
    import { addHistory } from "../lib/workHistory";

    let { item: step, handle = $bindable(null), el = $bindable(null), remove, resized } = $props();

    $effect(() => {
        step.type;
        step.title;
        if (resized) resized();
    });

    onDestroy(() => {
        if (get(currentFocus).obj === step) {
            focusData("project");
        }
    });

    const contextmenu = [
        { label: "플로우 실행", click: () => {} },
        { label: "단독 실행", click: () => {} },
        { type: "seperator" },
        { label: "잘라내기", click: () => {} },
        { label: "복사", click: () => {} },
        { label: "붙여넣기", click: () => {} },
        { type: "seperator" },
        {
            label: "삭제",
            click: () => {
                remove();
                return true;
            }
        }
    ];
</script>

<div
    class={["step", $currentFocus.obj === step && "focus"]}
    bind:this={el}
    onmousedown={(evt) => {
        if (evt.button || get(grabbing)) return;
        evt.stopPropagation();
        focusData("step", step);
        outClicked();
    }}
    use:rightclick={contextmenu}
>
    <div class="info">
        <div class="handle" bind:this={handle}>
            <Icon icon="hamburger" color="rgba(0, 0, 0, 0.5)" size={8} />
        </div>
        <span>
            {step.title?.length ? step.title : (StepTypes[step.type] ?? "빈 스텝")}
        </span>
    </div>
    {#if step.type === "CreateComponent"}
        <Component payload={step.payload} {resized} />
    {/if}
</div>

<style>
    .step {
        min-width: 100%;
        font-weight: 600;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
    }
    .handle {
        box-sizing: border-box;
        padding-inline: 6px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
    }
    .info {
        height: 30px;
        display: flex;
        flex-direction: row;
        align-items: center;
    }
</style>
