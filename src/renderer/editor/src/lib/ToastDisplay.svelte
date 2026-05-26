<script>
    import { fly } from "svelte/transition";
    import { toasts } from "./toast.svelte";
    import { quadIn, quadInOut, quadOut } from "svelte/easing";
    import { flip } from "svelte/animate";
    import Icon from "../assets/icons/Icon.svelte";
</script>

<div class="toasts-container">
    {#each toasts as toast (toast.symbol)}
        <div
            class="toast"
            in:fly={{ duration: 200, y: 200, opacity: 0, easing: quadOut }}
            out:fly={{ duration: 200, x: -260, opacity: 0, easing: quadIn }}
            animate:flip={{ duration: 200, easing: quadInOut }}
        >
            {#if toast.closable}
                <div class="close-btn" onclick={toast.destroy}>
                    <Icon icon="close" size={10} lineWidth={2} color="#000" />
                </div>
            {/if}
            <div class="title">{toast.title}</div>
            {#if toast.content}
                <div class="content">{toast.content}</div>
            {/if}
        </div>
    {/each}
</div>

<style>
    .toasts-container {
        max-height: 100%;
        position: fixed;
        left: 10px;
        bottom: 10px;
        display: flex;
        flex-direction: column;
        pointer-events: none;
        gap: 10px;
        width: 320px;
        z-index: var(--toast-z);
    }
    .toast {
        pointer-events: all;
        width: 100%;
        padding: 13px 14px 14px 14px;
        box-sizing: border-box;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        user-select: none;
        background-color: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        box-sizing: border-box;
        color: #fff;
        gap: 10px;
    }
    .close-btn {
        position: absolute;
        right: 0;
        top: 0;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: #fff;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transform: translate(5px, -5px);
        outline: solid #000 2px;
        opacity: 0.8;
    }
    .toast:hover .close-btn {
        display: flex;
    }
    .title {
        font-size: 18px;
        white-space: pre-wrap;
        word-break: keep-all;
        line-height: 100%;
    }
    .content {
        font-size: 14px;
        word-break: keep-all;
        line-height: 150%;
        margin-bottom: -3px;
    }
</style>
