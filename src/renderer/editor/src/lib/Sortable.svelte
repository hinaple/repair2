<script>
    import { onDestroy, onMount, tick } from "svelte";
    import Grabber from "./grabber";
    import { rInfo } from "../nodes/viewport";
    import { addHistory } from "./workHistory";
    import FrameUpdater from "./frameUpdater";
    import { cubicOut } from "svelte/easing";

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

    let finalGrabIdx = -1;
    let grabItemIdx = $state(-1);
    const frameUpdater = new FrameUpdater((now) => {
        if (grabItemIdx === -1) return;

        if (mouseMoved) {
            reorderWhileGrabbing(now);
            mouseMoved = false;
        }

        let stillMoving = false;
        listArr.forEach((l, i) => {
            if (i === grabItemIdx)
                l.top = Math.max(
                    0,
                    Math.min(containerInfo.height - l.rect.height / rInfo.ratio, l.grabTop)
                );
            else if (l.flip) {
                const t = cubicOut(Math.min(1, (now - l.flip.startedAt) / FLIP_DURATION));
                l.top = l.flip.from + (l.flip.to - l.flip.from) * t;
                if (t < 1) stillMoving = true;
                else l.flip = null;
            }
            l.el.style.transform = `translateY(${l.top}px)`;
        });
        onmoved?.();
        return stillMoving;
    });

    function reorderWhileGrabbing(now) {
        const grabbing = listArr[grabItemIdx];

        let targetIdx = grabItemIdx;
        if (grabbing.grabTop < grabbing.realTop) {
            for (let prevLine = grabbing.realTop; targetIdx > 0; targetIdx--) {
                const nextLine = prevLine - listArr[targetIdx - 1].rect.height / rInfo.ratio - gap;

                if (grabbing.grabTop > (nextLine + prevLine) / 2) break;
                prevLine = nextLine;
            }
        } else {
            for (let prevLine = grabbing.realTop; targetIdx < listArr.length - 1; targetIdx++) {
                const nextLine = prevLine + listArr[targetIdx + 1].rect.height / rInfo.ratio + gap;

                if (grabbing.grabTop < (nextLine + prevLine) / 2) break;
                prevLine = nextLine;
            }
        }

        if (targetIdx !== finalGrabIdx) {
            finalGrabIdx = targetIdx;
            calcFlipTop(now);
        }
    }

    function calcRealTop() {
        let currentTop = 0;
        for (let i = 0; i < listArr.length; i++) {
            listArr[i].realTop = currentTop;
            listArr[i].top = currentTop;

            currentTop += listArr[i].rect.height / rInfo.ratio + gap;
        }
        return currentTop - gap;
    }

    const FLIP_DURATION = 200;
    function calcFlipTop(now) {
        let currentTop = 0;
        for (let i = 0; i < listArr.length; i++) {
            const ii =
                grabItemIdx === -1
                    ? i
                    : i === finalGrabIdx
                      ? grabItemIdx
                      : i > finalGrabIdx && i <= grabItemIdx
                        ? i - 1
                        : i < finalGrabIdx && i >= grabItemIdx
                          ? i + 1
                          : i;
            if (
                ii !== grabItemIdx &&
                (listArr[ii].idx ?? ii) !== i &&
                typeof listArr[ii].top === "number"
            ) {
                listArr[ii].idx = i;
                listArr[ii].flip = {
                    from: listArr[ii].top,
                    to: currentTop,
                    startedAt: now
                };
            }
            currentTop += listArr[ii].rect.height / rInfo.ratio + gap;
        }
    }

    let mouseMoved = false;
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
                    finalGrabIdx = i;
                    const containerRect = container.getBoundingClientRect();
                    containerInfo.top = containerRect.top;
                    containerInfo.height = calcRealTop();
                    listArr[i].grabTop = (listArr[i].rect.top - containerInfo.top) / rInfo.ratio;

                    frameUpdater.draw();
                },
                onMoved: ({ dy }) => {
                    listArr[grabItemIdx].grabTop += dy;

                    mouseMoved = true;
                    frameUpdater.draw();
                },
                onMoveEnd: () => {
                    if (grabItemIdx !== finalGrabIdx) {
                        sortable.reorderWithHistory(addHistory, {
                            from: grabItemIdx,
                            to: finalGrabIdx
                        });
                    } else update();
                    grabItemIdx = -1;
                    finalGrabIdx = -1;
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

    let mounted = false;
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
</script>

<div
    class={["sortable-list", style, grabItemIdx !== -1 && "sorting"]}
    style={`gap: ${gap}px;` +
        (grabItemIdx !== -1 && containerInfo.height && `height: ${containerInfo.height}px;`)}
    bind:this={container}
>
    {#if style === "waterfall" && listArr.length}
        <div class="triangle top"></div>
    {/if}
    {#each listArr as item, i (item.key)}
        <div bind:this={item.el} class={["item-wrapper", grabItemIdx === i && "floating"]}>
            {#if i !== listArr.length - 1 && style === "waterfall"}
                <div class="triangle"></div>
            {/if}
            <div class="item">
                <Component
                    item={item.itemData}
                    {sortable}
                    bind:handle={item.handle}
                    remove={() => remove(i)}
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
    .sorting {
        pointer-events: none;
        contain: layout size style;
    }
    .sorting > .item-wrapper {
        position: absolute;
        top: 0;
        width: 100%;
    }
    .item-wrapper {
        box-sizing: border-box;
        position: relative;
    }
    .item-wrapper.floating {
        opacity: 0.5;
        width: 100%;
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

    .waterfall > .item-wrapper {
        border-bottom: solid #000 2px;
    }

    .enum > .item-wrapper {
        background-color: var(--b-o1);
    }
</style>
