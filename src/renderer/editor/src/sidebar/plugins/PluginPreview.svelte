<script>
    import { hoverHighlight } from "../../lib/highlight";
    import Icon from "../../assets/icons/Icon.svelte";
    import { getVscode, openVscode } from "../../lib/vscode";
    import { tippy } from "../../lib/tippy";

    let { info } = $props();

    let moreBtn = $state(null);
    let showOpt = $state(false);
</script>

<div
    use:tippy={{
        maxWidth: 250,
        placement: "bottom",
        animation: "fade",
        content: `${info.linked?.sourcePath ?? info.dir}`,
        delay: [200, null],
        hideOnClick: false,
        duration: 200
    }}
    class="plugin"
    use:hoverHighlight={{ type: "plugin", data: info.name }}
>
    {#if info.svelte}
        <Icon icon="svelte" color={!info.ready ? "#ff3636" : "#fff"} size={16} />
    {/if}
    <span class={["name", (!info.ready || info.error) && "error"]}>
        {info.name}
    </span>
    {#if !info.ready || info.error}
        <Icon icon="warn" color="#ff3636" size={16} />
    {/if}
    {#if info.linked}
        <Icon
            icon={info.linked.linked ? "linked" : "unlinked"}
            color="rgba(255, 255, 255, .6)"
            size={16}
        />
    {/if}
    {#if getVscode()}
        <button
            bind:this={moreBtn}
            class="more"
            onclick={() => openVscode(info.linked?.sourcePath ?? info.path)}
        >
            <Icon icon="vscode" color="#fff" size={18} />
        </button>
    {/if}
</div>

<style>
    .plugin {
        flex: 0 0 auto;
        width: 100%;
        border-radius: 5px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        padding-inline: 5px 3px;
        border: solid transparent 1px;
        flex-direction: row;
        gap: 5px;
        align-items: center;
        font-weight: 300;
        height: 30px;
    }
    .plugin:hover {
        border-color: var(--w-o2);
    }
    .name {
        margin-right: auto;
    }
    .error {
        font-weight: 600;
        color: #ff3636;
    }
    .more {
        padding: 3px 3px;
        border-radius: 5px;
        display: none;
        cursor: pointer;
    }
    .plugin:hover > .more {
        display: block;
    }
    .more:hover {
        background-color: var(--w-o1);
    }
</style>
