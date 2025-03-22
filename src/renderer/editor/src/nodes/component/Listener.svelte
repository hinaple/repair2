<script>
    import { onDestroy } from "svelte";
    import Icon from "../../assets/icons/Icon.svelte";
    import { outClicked, rightclick } from "../../lib/contextMenu/contextUtils";
    import { currentFocus, focusData } from "../../sidebar/editUtils";
    import { get } from "svelte/store";
    import { grabbing } from "../../lib/stores";
    import { ElementListenerTypes } from "../../lib/translate";
    import outputNode from "../lines/output";
    import { genClipboardFn } from "../../lib/clipboard";

    let {
        item: listener,
        handle = $bindable(null),
        el = $bindable(null),
        remove,
        hidden = false
    } = $props();

    onDestroy(() => {
        if (get(currentFocus).obj === listener) {
            focusData("project");
        }
    });

    const clipboardFn = genClipboardFn("listener", listener, () => remove());

    const contextmenu = [
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
</script>

<div class="listener" bind:this={el}>
    <div
        class={["container", $currentFocus.obj === listener && "focus"]}
        use:rightclick={contextmenu}
        onmousedown={(evt) => {
            if (evt.button || get(grabbing)) return;
            evt.stopPropagation();
            focusData("listener", listener, { clipboardFn });
            outClicked();
        }}
    >
        <div class="handle" bind:this={handle}>
            <Icon icon="hamburger" color="rgba(255, 255, 255, 0.5)" size={8} />
        </div>
        <div class="title">
            {listener.title ??
                listener.payload?.channel ??
                ElementListenerTypes[listener.type] ??
                "리스너"}
        </div>
        {#if !hidden}
            <div
                class="output"
                use:outputNode={{
                    id: listener.id,
                    output: listener.output,
                    isHeadingBottom: false
                }}
            ></div>
        {/if}
    </div>
</div>

<style>
    .listener {
        min-width: 100%;
        box-sizing: border-box;
        font-size: 12px;
        font-weight: 400;
        height: 25px;
        padding-left: 15px;
    }
    .container {
        position: relative;
        border-radius: 5px 0 0 5px;
        color: #fff;
        background-color: #000;
        height: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
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
    .title {
        flex: 1 1 auto;
    }
    .output {
        position: absolute;
        width: 14px;
        height: 14px;
        background-color: #000;
        right: -14px;
        border-radius: 0 7px 7px 0;
        cursor: grab;
    }
</style>
