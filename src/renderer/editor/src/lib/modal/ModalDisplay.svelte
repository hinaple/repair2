<script>
    import { autofocus } from "../actions/autofocus";
    import Checkbox from "../../sidebar/input/Checkbox.svelte";
    import { closeModal, modal } from "./modal.svelte.js";

    let values = $state(null);
    $effect(
        () =>
            (values = modal.currentModal?.fields
                ? Array.from(modal.currentModal?.fields, (f) => f.value ?? null)
                : null)
    );

    let confirmable = $derived(
        !modal.currentModal?.fields?.some?.(
            ({ type, required = false }, i) => required && type !== "checkbox" && !values[i]
        )
    );

    function tryConfirm() {
        if (!confirmable) return;
        closeModal({ canceled: false, fields: $state.snapshot(values) });
    }
    function cancel() {
        closeModal({ canceled: true });
    }

    function onkeydown({ key }) {
        if (key === "Enter") tryConfirm();
        else if (key === "Escape") cancel();
    }
</script>

<svelte:body {onkeydown} />

{#if modal.currentModal && values}
    {@const m = modal.currentModal}
    {@const buttons = m.buttons ?? [{ label: "취소" }, { label: "확인" }]}
    <div class="modal-wrapper">
        <div class="modal">
            {#if m.title}
                <div class="title">{m.title}</div>
            {/if}
            <div class="body">
                {#each m.fields as f, i}
                    {@const af = f.autofocus && autofocus}
                    <div
                        class={["field", f.type ?? "input"]}
                        onclick={() => f.type === "checkbox" && (values[i] = !values[i])}
                    >
                        <span class="label">{f.label}</span>
                        {#if f.type === "checkbox"}
                            <Checkbox value={!!values[i]} />
                        {:else if f.type === "select"}
                            {@const options = Array.isArray(f.options)
                                ? f.options.map((opt) => [opt, opt])
                                : Object.entries(f.options)}
                            <select bind:value={values[i]} use:af>
                                <option value={null} hidden={!!f.required}>
                                    {typeof f.placeholder === "string"
                                        ? f.placeholder
                                        : "선택 없음"}
                                </option>
                                {#each options as [value, label]}
                                    <option {value}>{label}</option>
                                {/each}
                            </select>
                        {:else}
                            <input
                                type="text"
                                value={values[i]}
                                oninput={(evt) => {
                                    values[i] = f.filter?.(evt.target.value) ?? evt.target.value;
                                    evt.target.value = values[i];
                                }}
                                placeholder={f.placeholder}
                                use:af
                            />
                        {/if}
                    </div>
                {/each}
            </div>
            <div class="buttons">
                {#each buttons as btn, i}
                    {@const isCancel = buttons.length - 1 !== i}
                    <button
                        class={[isCancel ? "cancel" : "confirm"]}
                        disabled={!isCancel && !confirmable}
                        onclick={() => {
                            const params = { canceled: isCancel, fields: $state.snapshot(values) };
                            if (btn.onclick && !btn.onclick(params)) return;
                            closeModal(params);
                        }}
                    >
                        {btn.label}
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-wrapper {
        z-index: var(--modal-z);
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: var(--b-o4);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .modal {
        min-width: 300px;
        max-width: calc(100% - 100px);
        max-height: calc(100% - 100px);
        color: #fff;
        background-color: #232323;
        display: flex;
        flex-direction: column;
        border-radius: 10px;
    }
    .title {
        padding: 15px;
        flex: 0 0 auto;
    }
    .title {
        border-bottom: solid var(--w-o8) 1px;
    }
    .body {
        display: flex;
        flex-direction: column;
        padding: 15px 15px 20px 15px;
        gap: 10px;
    }
    .field {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .field.checkbox {
        flex-direction: row;
        justify-content: end;
        align-items: center;
        padding-right: 5px;
        gap: 10px;
        margin-top: 10px;
    }
    .label {
        opacity: 0.8;
        font-size: 14px;
        margin-left: 3px;
    }
    .buttons {
        border-top: solid rgba(255, 255, 255, 0.4) 1px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: end;
        gap: 10px;
        flex: 0 0 auto;
        padding: 10px 15px;
    }
    button {
        padding: 3px 8px;
        font-size: 16px;
        border-radius: 5px;
        border: solid var(--w-o2) 1px;
        color: #fff;
        cursor: pointer;
    }
    button.cancel {
        opacity: 0.8;
    }
    button.cancel:hover {
        opacity: 1;
    }
    button:disabled {
        opacity: 0.2;
        cursor: not-allowed;
    }
    button.confirm {
        border-color: transparent;
        background-color: var(--blue-dark);
    }
</style>
