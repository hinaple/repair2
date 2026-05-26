<script>
    import Icon from "../assets/icons/Icon.svelte";
    import { addHistory } from "./workHistory";

    let { falseIcon, trueIcon, value, onclick = null, setter = null } = $props();

    function clickHandler() {
        onclick?.();
        if (setter) addHistory({ doFn: setter, doData: !value, undoData: value });
    }
</script>

<button onclick={clickHandler} class={[value && "true"]}>
    <Icon icon={value ? trueIcon : falseIcon} size={18} color="rgba(255, 255, 255, .8)" />
</button>

<style>
    button {
        padding: 5px;
        border-radius: 5px;
        opacity: 0.8;
        flex: 0 0 auto;
        cursor: pointer;
    }
    .true {
        background-color: rgba(255, 255, 255, 0.1);
    }
    button:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.1);
    }
</style>
