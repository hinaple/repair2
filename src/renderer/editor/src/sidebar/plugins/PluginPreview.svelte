<script>
    import { hoverHighlight } from "../../lib/highlight";
    import Icon from "../../assets/icons/Icon.svelte";

    let { info } = $props();

    let moreBtn = $state(null);
    let showOpt = $state(false);
</script>

<div class="plugin" use:hoverHighlight={{ type: "plugin", data: info.name }}>
    {#if info.svelte}
        <Icon icon="svelte" color={!info.ready ? "#ff3636" : "#fff"} size={16} />
    {/if}
    <span class={["name", (!info.ready || info.error) && "error"]}>
        {info.name}
    </span>
    {#if !info.ready}
        <Icon icon="warn" color="#ff3636" size={16} />
    {/if}
    {#if info.linked}
        <Icon
            icon={info.linked.linked ? "linked" : "unlinked"}
            color="rgba(255, 255, 255, .6)"
            size={16}
        />
    {/if}
    <button bind:this={moreBtn} class="more"
        ><Icon icon="ellipsis" color="#fff" size={14} />
    </button>
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
        padding: 5px 5px;
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
