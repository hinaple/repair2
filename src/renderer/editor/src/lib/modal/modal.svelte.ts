type Field = { label: string; autofocus?: boolean } & (
    | {
          type: "select";
          placeholder?: string | boolean;
          value?: string;
          options: string[] | Record<string, string>;
          required?: boolean;
      }
    | {
          type: "input";
          placeholder?: string;
          value?: string;
          filter?: (value: string) => string | null;
          required?: boolean;
      }
    | {
          type: "checkbox";
          value?: boolean;
      }
);

type ResolveParams = {
    canceled: boolean;
    fields?: (boolean | string)[];
};
type Resolve = (modalData: ResolveParams) => void;

type Button = {
    label: string;
    onclick?: Resolve;
};

type Modal = {
    title: string;
    fields: Field[];
    buttons?: Button[];
    resolve?: Resolve;
};

export const modal: { currentModal: Modal | null } = $state({ currentModal: null });

export function showModal(m: Modal & { resolve?: undefined }) {
    closeModal();
    modal.currentModal = { ...m };
}
export function showModalPromise(m: Modal & { resolve?: undefined }): Promise<ResolveParams> {
    closeModal();
    return new Promise((resolve) => {
        modal.currentModal = { ...m, resolve };
    });
}

export function closeModal(params: ResolveParams = { canceled: true }) {
    if (!modal.currentModal) return;
    modal.currentModal.resolve?.(params);
    modal.currentModal = null;
}
