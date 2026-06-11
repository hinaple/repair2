import { ipc } from "../ipc";

type EditFn = (editOpt: { title: string | null; content: string | null }) => boolean;

type ToastTypes = "normal" | "error" | "warning";

export type Toast = {
    id: string | null;
    type: ToastTypes;
    symbol: symbol;
    title: string | null;
    content: string | null;
    duration: number;
    closable: boolean;
    timeout: ReturnType<typeof setTimeout> | null;
    destroy: () => void;
    edit: EditFn;
};

type ShowToastOptions = (
    | {
          id: string | null;
          title?: string | null;
      }
    | {
          id?: string | null;
          title: string | null;
      }
) & {
    type?: ToastTypes;
    content?: string | null;
    duration?: number | null;
    closable?: boolean | null;
};

export const toasts: Toast[] = $state([]);

export function showToast({
    id = null,
    title = null,
    content = null,
    duration = null,
    closable = null,
    type = "normal"
}: ShowToastOptions): Toast {
    console.log(
        `%c${title}${content ? `\n${content}` : ""}`,
        "font-family: system-ui; color: #fff; font-weight: bold;" +
            "display: inline-block; background-color: #140959; padding: 3px 15px; border-radius: 3px; margin-right: 5px;",
        ""
    );

    const alreadyToast = id ? toasts.find((t) => t.id === id) : null;
    if (alreadyToast) {
        title !== null && (alreadyToast.title = title);
        content !== null && (alreadyToast.content = content);
        closable !== null && (alreadyToast.closable = closable);
        if (duration !== null) {
            if (alreadyToast.timeout) clearTimeout(alreadyToast.timeout);
            alreadyToast.timeout = duration > 0 ? setTimeout(alreadyToast.destroy, duration) : null;
        }

        return alreadyToast;
    }

    const symbol = Symbol();

    let destoryed = false;
    const edit: EditFn = ({ title: editTitle = null, content: editContent = null }) =>
        toasts.some((t) => {
            if (t.symbol !== symbol) return false;

            editTitle && (t.title = editTitle);
            editContent && (t.content = editContent);
            return true;
        });
    const destroy = () => {
        if (destoryed) return;
        if (timeout) clearTimeout(timeout);
        destoryed = true;
        const idx = toasts.findIndex((t) => t.symbol === symbol);
        if (idx === -1) return false;
        toasts.splice(idx, 1);
        return true;
    };
    const timeout = duration ? setTimeout(destroy, +duration) : null;
    const toast = {
        id,
        symbol,
        type,
        title,
        content,
        duration: duration === null ? 3000 : duration,
        closable: closable ?? true,
        destroy,
        edit,
        timeout
    };
    toasts.push(toast);

    return toast;
}

function getPluginLabel(plugin: { id?: string; type?: string; instanceId?: string } | null = null) {
    if (!plugin) return null;
    return [plugin.id, plugin.type, plugin.instanceId].filter(Boolean).join(" / ") || null;
}

function getDiagnosticSubjectLabel(
    source: string | null = null,
    subject: { id?: string; type?: string; instanceId?: string } | null = null
) {
    const subjectLabel = getPluginLabel(subject);
    const subjectTitle = source === "plugin" ? "Plugin" : "Subject";
    return [
        source ? `Source: ${source}` : null,
        subjectLabel ? `${subjectTitle}: ${subjectLabel}` : null
    ]
        .filter(Boolean)
        .join("\n");
}

ipc.on("exporting", (evt, process) => {
    showToast({
        id: "exporting",
        title: "프로젝트 파일을 내보내고 있습니다.",
        content: `${process ? `${process}% ` : ""}내보내는 중`,
        duration: 0,
        closable: false
    });
});
ipc.on("exported", (evt, filepath) => {
    showToast({
        id: "exporting",
        title: "프로젝트 파일을 내보냈습니다.",
        content: filepath,
        duration: 2000
    });
});

ipc.on("serial-connected", (evt, port) => {
    showToast({
        title: "시리얼 통신이 시작되었습니다.",
        content: `포트: <${port}>`,
        duration: 5000
    });
});
ipc.on("serial-income", (evt, data) => {
    showToast({
        title: "시리얼 통신 데이터를 수신했습니다.",
        content: data,
        duration: 3000
    });
});

ipc.on("socket-failed", () => {
    showToast({ title: "소켓 통신 연결에 실패했습니다.", duration: 5000 });
});

ipc.on("socket-income", (evt, channel, data, url) => {
    if (channel === "connect")
        showToast({
            title: "소켓 통신이 시작되었습니다.",
            content: `URL: <${url}>`,
            duration: 5000
        });
    else if (channel === "disconnect")
        showToast({
            title: "소켓 통신이 종료되었습니다.",
            content: `URL: <${url}>`,
            duration: 5000
        });
    else
        showToast({
            title: "소켓 통신 데이터를 수신했습니다.",
            content: `채널: <${channel}>\n<${data}>`,
            duration: 3000
        });
});

// ipc.on("custom-log", (evt, content) => {
//     showToast({ title: content, duration: 5000 });
// });

// ipc.on("diagnostic-log", (evt, { level, title, detail, source, subject }) => {
//     const subjectLabel = getDiagnosticSubjectLabel(source, subject);
//     showToast({
//         title,
//         content: [subjectLabel, detail].filter(Boolean).join("\n\n"),
//         duration: level === "error" || level === "warning" ? 8000 : 5000
//     });
// });
