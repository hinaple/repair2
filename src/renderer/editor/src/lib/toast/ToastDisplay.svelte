<script>
    import { fly } from "svelte/transition";
    import { toasts } from "./toast.svelte";
    import { quadIn, quadInOut, quadOut } from "svelte/easing";
    import { flip } from "svelte/animate";
    import Icon from "../../assets/icons/Icon.svelte";
    import event from "../actions/eventAction";

    let wrapper;

    function scroll(evt) {
        wrapper?.scrollBy({ y: evt.deltaY, behavior: "smooth" });
    }
</script>

{#if toasts.length}
    <div bind:this={wrapper} class="wrapper">
        <div class="toasts-container" use:event={["wheel", scroll, { passive: true }]}>
            {#each toasts as toast (toast.symbol)}
                <div
                    class={["toast", toast.type]}
                    in:fly|global={{ duration: 200, y: 200, opacity: 0, easing: quadOut }}
                    out:fly|global={{ duration: 200, x: 260, opacity: 0, easing: quadIn }}
                    animate:flip={{ duration: 200, easing: quadInOut }}
                >
                    {#if toast.closable}
                        <div class="close-btn" onclick={toast.destroy}>
                            <Icon icon="close" size={10} lineWidth={2} color="#fff" />
                        </div>
                    {/if}
                    <div class="title">
                        {#if toast.type === "error"}
                            <Icon icon="warn" color="#000" size={16} />
                        {/if}
                        <div class="title-text">
                            {toast.title}
                        </div>
                    </div>
                    {#if toast.content}
                        <div class="content">{toast.content}</div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .wrapper {
        z-index: var(--toast-z);
        width: 320px;
        height: 100%;
        overflow-y: scroll;
        position: fixed;
        right: 0;
        pointer-events: none;
        box-sizing: border-box;
        display: flex;
        flex-direction: column-reverse;

        contain: paint layout size style;
    }
    .wrapper::-webkit-scrollbar {
        display: none;
    }
    .toasts-container {
        box-sizing: border-box;
        margin: 5px 5px 5px 0;
        pointer-events: all;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    .toast {
        position: relative;
        width: 100%;
        padding: 12px 10px;
        box-sizing: border-box;
        border-radius: 5px;
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        user-select: none;
        background-color: var(--darkgray);
        box-sizing: border-box;
        color: #fff;
        gap: 5px;
    }
    .toast.error {
        color: #000;
        font-weight: 600;
        background-color: #ff3636;
    }
    .close-btn {
        position: absolute;
        right: 0;
        top: 0;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: #767879;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transform: translate(5px, -5px);
    }
    .close-btn:hover {
        background-color: #616263;
    }
    .toast:hover .close-btn {
        display: flex;
    }
    .title {
        font-size: 14px;
        line-height: 120%;
        font-weight: 600;
        margin-inline: auto;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
    }
    .title-text {
        word-break: break-all;
        white-space: pre-wrap;
    }
    .content {
        font-size: 12px;
        word-break: break-all;
        line-height: 140%;
        margin-bottom: -3px;
    }
</style>
