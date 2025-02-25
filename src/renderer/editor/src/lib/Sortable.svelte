<script>
    import { onDestroy, onMount, tick } from "svelte";
    import Grabber from "./grabber";
    import { rInfo } from "../nodes/viewport";
    import { flip } from "svelte/animate";
    import { addHistory } from "./workHistory";
    import FrameUpdater from "./frameUpdater";

    let {
        sortable,
        Component,
        resized,
        onremoved = null,
        onmoved = null,
        style = "waterfall",
        ...props
    } = $props();
    let listArr = $state([]);

    const Gaps = {
        enum: 5,
        listener: 5
    };
    const gap = Gaps[style] ?? 0;

    $effect(() => {
        sortable.list;
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

    const frameUpdater = new FrameUpdater(() => {
        if (grabItemIdx === -1) return;
        if (floatingItemInfo.top < 0) floatingItemInfo.el.style.top = "0px";
        else if (floatingItemInfo.top + floatingItemInfo.size.height >= containerInfo.height)
            floatingItemInfo.el.style.top = `${(containerInfo.height - floatingItemInfo.size.height) / rInfo.ratio}px`;
        else floatingItemInfo.el.style.top = `${floatingItemInfo.top / rInfo.ratio}px`;
    });

    let moveFrameUpdater;
    if (onmoved) {
        moveFrameUpdater = new FrameUpdater(() => {
            onmoved();
            return flipMoving;
        });
    }

    let mounted = false;

    let lastZone;
    async function update() {
        if (!mounted) return;
        clearGrabbers();
        listArr = sortable.list.map((l) => ({
            el: null,
            handle: null,
            itemData: l,
            key: Symbol()
        }));
        if (props.noGrab) return;
        await tick();
        listArr.forEach((d, i) => {
            d.grabber = new Grabber({
                container: d.el,
                handle: d.handle,
                onMoveStart: () => {
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

                    frameUpdater.draw();
                },
                onMoved: ({ dy }) => {
                    if (onmoved) moveFrameUpdater.draw();

                    floatingItemInfo.top += dy * rInfo.ratio;
                    frameUpdater.draw();

                    const floatingCenter = floatingItemInfo.top + floatingItemInfo.size.height / 2;

                    if (lastZone && floatingCenter > lastZone[0] && floatingCenter < lastZone[1])
                        return;
                    lastZone = null;

                    let checkingHeight = 0,
                        targetIdx;
                    for (targetIdx = 0; targetIdx < listArr.length; targetIdx++) {
                        checkingHeight += listArr[targetIdx].rect.height;
                        if (floatingCenter < checkingHeight || targetIdx === listArr.length - 1)
                            break;
                        checkingHeight += gap;
                    }

                    if (targetIdx !== grabItemIdx) {
                        lastZone = [
                            checkingHeight - listArr[targetIdx].rect.height - gap,
                            checkingHeight
                        ];

                        listArr = listArr.toSpliced(
                            targetIdx,
                            0,
                            listArr.splice(grabItemIdx, 1)[0]
                        );
                        grabItemIdx = targetIdx;
                        flipStart();
                    }
                },
                onMoveEnd: () => {
                    if (grabItemIdx !== originalGrabIdx) {
                        sortable.reorderWithHistory(addHistory, {
                            from: originalGrabIdx,
                            to: grabItemIdx
                        });
                    } else update();
                    grabItemIdx = -1;
                    originalGrabIdx = -1;
                    lastZone = null;
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

    onMount(() => {
        mounted = true;
        update();
    });
    onDestroy(clearGrabbers);

    function remove(idx) {
        sortable.removeWithHistory(sortable.list[idx], addHistory, () => {
            resized();
            if (onremoved) onremoved();
        });
    }

    let endTimeout;
    let flipMoving = false;
    function flipStart() {
        if (endTimeout) clearTimeout(endTimeout);
        flipMoving = true;
        endTimeout = setTimeout(flipEnd, 200);
    }
    function flipEnd() {
        flipMoving = false;
    }
</script>

<div
    class={["sortable-list", style, grabItemIdx !== -1 && "unclickable"]}
    style:gap={`${gap}px`}
    bind:this={container}
>
    {#if grabItemIdx !== -1}
        <div
            class="floating"
            bind:this={floatingItemInfo.el}
            style={`width: ${floatingItemInfo.size.width / rInfo.ratio}px;` +
                `height: ${floatingItemInfo.size.height / rInfo.ratio}px;`}
        >
            {#if style === "waterfall"}
                <div class="triangle"></div>
            {/if}
            <Component item={floatingItemInfo.original} noGrab />
        </div>
    {/if}
    {#if style === "waterfall" && listArr.length}
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
            {:else if i !== listArr.length - 1 && style === "waterfall"}
                <div class="triangle"></div>
            {/if}
            <div class="item">
                <Component
                    item={item.itemData}
                    {sortable}
                    bind:el={item.el}
                    bind:handle={item.handle}
                    remove={() => remove(i)}
                    hidden={grabItemIdx === i}
                    {...props}
                />
            </div>
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
        z-index: 2;
        opacity: 0.6;
    }
    .unclickable {
        pointer-events: none;
    }
    .item-wrapper {
        box-sizing: border-box;
        position: relative;
    }
    .item-wrapper.dummy {
        opacity: 0;
    }
    .dummy .item {
        display: none;
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

    .waterfall > .floating {
        transform: translateY(-2px);
        border-block: solid #000 2px;
    }
    .waterfall > .item-wrapper {
        border-bottom: solid #000 2px;
    }

    .enum > .floating {
        background-color: rgba(0, 0, 0, 0.3);
    }
    .enum > .item-wrapper {
        background-color: rgba(0, 0, 0, 0.1);
    }

    .listener > .floating {
        opacity: 0.4;
    }
</style>
