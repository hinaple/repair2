<script>
    import { hoverHighlight } from "../../lib/highlight";
    import Icon from "../../assets/icons/Icon.svelte";

    let { info } = $props();

    let moreBtn = $state(null);
    let showOpt = $state(false);
</script>

<div class="plugin" use:hoverHighlight={{ type: "plugin", data: info.name }}>
    <span>
        {info.name}
    </span>
    <div class="type">{info.type}</div>
    <button bind:this={moreBtn} class="more"
        ><Icon icon="ellipsis" color="#fff" size={14} />
    </button>
</div>

<style>
    .plugin {
        width: 100%;
        border-radius: 5px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        padding: 5px 0 8px 10px;
        position: relative;
        gap: 5px;
    }
    .plugin:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }
    .type {
        background-color: rgba(255, 255, 255, 0.8);
        color: #000;
        font-size: 14px;
        padding: 0px 3px;
        border-radius: 5px;
        font-weight: 600;
        width: fit-content;
    }
    .more {
        padding: 5px 5px;
        border-radius: 5px;
        cursor: pointer;
        position: absolute;
        right: 3px;
        top: 3px;
        opacity: 0;
    }
    .plugin:hover > .more {
        opacity: 1;
    }
    .more:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }
</style>
