<script>
    import { onDestroy, tick } from "svelte";
    import Grabber from "./grabber";
    import { rInfo } from "../nodes/viewport";
    import { flip } from "svelte/animate";
    import { addHistory } from "./workHistory";

    let { sortable, Component, resized, ...props } = $props();
    let listArr = $state([]);
    $effect(() => {
        update();
    });

    let container = $state(null);
    let containerInfo = $state({ top: 0, height: 0 });

    let originalGrabIdx = $state(-1);
    let grabItemIdx = $state(-1);
    let floatingItemInfo = $state({
        el: null,
        top: 0,
        size: { width: 0, height: 0 },
        original: null
    });
    function updateFloatingItemPos() {
        if (floatingItemInfo.top < 0) floatingItemInfo.el.style.top = "0px";
        else if (floatingItemInfo.top + floatingItemInfo.size.height >= containerInfo.height)
            floatingItemInfo.el.style.top = `${(containerInfo.height - floatingItemInfo.size.height) / rInfo.ratio}px`;
        else floatingItemInfo.el.style.top = `${floatingItemInfo.top / rInfo.ratio}px`;
    }
    let lastZone;

    async function update() {
        clearGrabbers();
        listArr = sortable.list.map((l) => ({
            el: null,
            handle: null,
            itemData: l,
            key: Symbol()
        }));
        await tick();
        listArr.forEach((d, i) => {
            d.grabber = new Grabber({
                container: d.el,
                handle: d.handle,
                onMoveStart: async () => {
                    listArr.forEach((l) => {
                        l.rect = l.el.getBoundingClientRect();
                    });
                    grabItemIdx = i;
                    originalGrabIdx = i;
                    floatingItemInfo.original = listArr[grabItemIdx].itemData;
                    const containerRect = container.getBoundingClientRect();
                    containerInfo.top = containerRect.top;
                    containerInfo.height = containerRect.height;
                    floatingItemInfo.top = listArr[i].rect.top - containerInfo.top;
                    floatingItemInfo.size.width = listArr[i].rect.width;
                    floatingItemInfo.size.height = listArr[i].rect.height;

                    await tick();
                    floatingItemInfo.el.style.width = `${floatingItemInfo.size.width / rInfo.ratio}px`;
                    floatingItemInfo.el.style.height = `${floatingItemInfo.size.height / rInfo.ratio}px`;
                    updateFloatingItemPos();
                },
                onMoved: ({ dy }) => {
                    floatingItemInfo.top += dy * rInfo.ratio;
                    updateFloatingItemPos();

                    const floatingCenter = floatingItemInfo.top + floatingItemInfo.size.height / 2;

                    if (lastZone && floatingCenter > lastZone[0] && floatingCenter < lastZone[1])
                        return;
                    else if (lastZone) lastZone = null;

                    let checkingHeight = 0,
                        targetIdx;
                    for (targetIdx = 0; targetIdx < listArr.length; targetIdx++) {
                        checkingHeight += listArr[targetIdx].rect.height;
                        if (floatingCenter < checkingHeight || targetIdx === listArr.length - 1)
                            break;
                    }

                    if (targetIdx !== grabItemIdx) {
                        lastZone = [
                            checkingHeight - listArr[targetIdx].rect.height,
                            checkingHeight
                        ];

                        listArr = listArr.toSpliced(
                            targetIdx,
                            0,
                            listArr.splice(grabItemIdx, 1)[0]
                        );
                        grabItemIdx = targetIdx;
                    }
                },
                onMoveEnd: () => {
                    if (grabItemIdx !== originalGrabIdx) {
                        $effect.root(() => {
                            sortable.reorderWithHistory(addHistory, {
                                from: originalGrabIdx,
                                to: grabItemIdx
                            });
                        });
                    }
                    grabItemIdx = -1;
                    originalGrabIdx = -1;
                    lastZone = null;
                    update();
                }
            });
        });
    }
    function clearGrabbers() {
        $effect.root(() => {
            listArr.forEach((d) => {
                if (d.grabber) d.grabber.destroy();
            });
        });
    }

    onDestroy(clearGrabbers);

    function remove(idx) {
        sortable.removeWithHistory(sortable.list[idx], addHistory, resized);
    }
</script>

<div class={["sortable-list", grabItemIdx !== -1 && "unclickable"]} bind:this={container}>
    {#if grabItemIdx !== -1}
        <div class="floating" bind:this={floatingItemInfo.el}>
            <div class="triangle"></div>
            <Component item={floatingItemInfo.original} />
        </div>
    {/if}
    {#if listArr.length}
        <div class="triangle top"></div>
    {/if}
    {#each listArr as item, i (item.key)}
        <div
            class={["item-wrapper", grabItemIdx === i && "dummy"]}
            animate:flip={{ duration: 200 }}
        >
            {#if grabItemIdx === i}
                <div
                    style={`width: ${floatingItemInfo.size.width / rInfo.ratio}px;` +
                        `height: ${floatingItemInfo.size.height / rInfo.ratio}px;`}
                ></div>
            {:else}
                {#if i !== listArr.length - 1}
                    <div class="triangle"></div>
                {/if}
                <Component
                    item={item.itemData}
                    {sortable}
                    bind:el={item.el}
                    bind:handle={item.handle}
                    remove={() => remove(i)}
                    {...props}
                />
            {/if}
        </div>
    {/each}
</div>

<style>
    .sortable-list {
        display: flex;
        flex-direction: column;
        width: 100%;
        position: relative;
    }
    .floating {
        position: absolute;
        border-block: solid #000 2px;
        transform: translateY(-2px);
        z-index: 2;
        opacity: 0.6;
    }
    .unclickable {
        pointer-events: none;
    }
    .item-wrapper {
        border-bottom: solid #000 2px;
        box-sizing: border-box;
        position: relative;
    }
    .item-wrapper.dummy {
        opacity: 0;
    }
    .triangle {
        position: absolute;
        right: 10px;
        bottom: -8px;
        border: solid;
        border-width: 6px 6px 0 6px;
        border-color: #000 transparent transparent transparent;
        z-index: 1;
        pointer-events: none;
    }
    .triangle.top {
        bottom: auto;
        top: 0;
    }
</style>
