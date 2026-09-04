import type { Field, Modal, ModalResult, Resolve, ResolveParams } from "./types";

export const modal: { currentModal: Modal | null } = $state({ currentModal: null });

export function showModal(m: Modal & { resolve?: undefined }) {
  closeModal();
  modal.currentModal = { ...m };
}

export function showModalPromise<const Fields extends readonly Field[]>(
  m: Modal<Fields> & { resolve?: undefined }
): Promise<ModalResult<Fields>> {
  closeModal();

  return new Promise((resolve) => {
    modal.currentModal = { ...m, resolve: resolve as Resolve };
  });
}

export function closeModal(params: ResolveParams = { canceled: true }) {
  if (!modal.currentModal) return;
  modal.currentModal.resolve?.(params);
  modal.currentModal = null;
}
