<script>
    import { get } from "svelte/store";
    import Icon from "../assets/icons/Icon.svelte";
    import { currentFocus, focusData } from "../sidebar/editUtils";
    import { grabbing, reload } from "../lib/stores";
    import { StepTypes } from "../lib/translate";
    import Component from "./component/Component.svelte";
    import { outClicked, rightclick } from "../lib/contextMenu/contextUtils";
    import { onDestroy } from "svelte";
    import registerHighlight from "../lib/highlight";
    import { genClipboardFn } from "../lib/clipboard";
    import { startMonitoring } from "../lib/runtimeMonitor.svelte";

    let {
        item: step,
        handle = $bindable(null),
        el = $bindable(null),
        remove,
        noGrab = false,
        nodeCountChanged
    } = $props();

    $effect(() => {
        step.type;
        step.title;
        reload("nodeMoved");
    });

    const clipboardFn = genClipboardFn("step", step, remove);

    const contextmenu = [
        // { label: "플로우 실행", click: () => {} },
        // { label: "단독 실행", click: () => {} },
        // { type: "seperator" },
        {
            label: "잘라내기",
            click: clipboardFn.cut
        },
        {
            label: "복사",
            click: clipboardFn.copy
        },
        {
            label: "붙여넣기",
            click: clipboardFn.paste
        },
        { type: "seperator" },
        {
            label: "삭제",
            click: () => {
                remove();
                return true;
            },
            action: "remove"
        }
    ];

    let hlData = $derived.by(() => {
        if (step.type === "Others.setVariable")
            return { type: "variable", data: step.payload?.variableId, active: true };
        else if (step.type === "Others.executePlugin")
            return { type: "plugin", data: step.payload?.plugin.name, active: true };
        else if (step.type === "Others.runtimePluginStep")
            return { type: "plugin", data: step.payload?.pluginName, active: true };
        return { active: false };
    });

    let activated = $state(false);
    const unsub = startMonitoring("steps", step.id, (f) => (activated = f));

    onDestroy(() => {
        unsub();
        if (get(currentFocus).obj === step) {
            focusData("project");
        }
    });
</script>

<div
    class={["step", $currentFocus.obj === step && "focus", activated && "activated"]}
    bind:this={el}
    onpointerdown={(evt) => {
        if (evt.button || $grabbing) return;
        evt.stopPropagation();
        focusData("step", step, { clipboardFn });
        outClicked();
    }}
    use:rightclick={contextmenu}
    use:registerHighlight={hlData}
>
    <div class="info">
        <div class="handle" bind:this={handle}>
            <Icon
                icon="hamburger"
                color={activated ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"}
                size={8}
            />
        </div>
        <div class="title-wrapper">
            <div class="title">
                {step.displayTitle ?? StepTypes[step.type] ?? "빈 스텝"}
            </div>
        </div>
    </div>
    {#if step.type === "Component.create"}
        <Component payload={step.payload} {noGrab} {nodeCountChanged} />
    {/if}
</div>

<style>
    .step {
        width: 100%;
        font-weight: 600;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
    }
    .step.activated {
        background-color: var(--orange);
        color: #fff;
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
        overflow-x: hidden;
    }
    .title-wrapper {
        height: 100%;
        width: calc(100% - 25px);
        position: relative;
    }
    .title {
        transform: translateY(5.5px);
        width: 100%;
        position: absolute;
        text-overflow: ellipsis;
        word-break: break-all;
        overflow-x: hidden;
        white-space: nowrap;
    }
</style>
