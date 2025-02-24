<script>
    let { value, onclick } = $props();
</script>

<div class="checkbox" {onclick}>
    <div class={["inner", value && "checked"]}></div>
</div>

<style>
    .checkbox {
        width: 20px;
        height: 20px;
        background-color: #fff;
        position: relative;
        cursor: pointer;
        border: solid #000 1px;
        box-sizing: border-box;
    }
    .inner {
        background-color: #000;
        width: 0;
        height: 0;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        transition: all 200ms ease;
    }
    .inner.checked {
        width: 12px;
        height: 12px;
    }
</style>
