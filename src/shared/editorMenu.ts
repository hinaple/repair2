import type { Override } from "./utils.types";

const EditorMenu = [
  {
    id: "file",
    label: "파일",
    key: "F",
    items: [
      {
        label: "새 프로젝트",
        action: "new-project",
        shortcut: "Ctrl+N"
      },
      { type: "separator" },
      {
        label: "저장",
        action: "save",
        shortcut: "Ctrl+S"
      },
      { type: "separator" },
      {
        label: "프로젝트 불러오기",
        action: "import-project",
        shortcut: "Ctrl+Shift+O"
      },
      {
        label: "프로젝트 내보내기",
        action: "export-project",
        shortcut: "Ctrl+Shift+S"
      },
      { type: "separator" },
      {
        label: "데이터 폴더 열기",
        action: "open-data-folder"
      },
      { type: "separator" },
      {
        label: "RepairV2 종료",
        action: "quit",
        shortcut: "Ctrl+Q"
      }
    ]
  },
  {
    id: "edit",
    label: "편집",
    key: "E",
    items: [
      {
        label: "취소",
        action: "undo",
        shortcut: "Ctrl+Z",
        editorAction: true
      },
      {
        label: "재실행",
        action: "redo",
        shortcut: "Ctrl+Shift+Z",
        editorAction: true
      }
    ]
  },
  {
    id: "tools",
    label: "도구",
    key: "T",
    items: [
      {
        label: "편집기 콘솔",
        action: "toggle-editor-devtools",
        shortcut: "Ctrl+Shift+I"
      },
      {
        label: "플레이 콘솔",
        action: "toggle-player-devtools"
      }
    ]
  },
  {
    id: "plugin",
    label: "플러그인",
    key: "P",
    items: [
      {
        label: "새 플러그인 생성",
        action: "create-plugin",
        editorAction: true
      },
      {
        label: "플러그인 전체 다시 빌드",
        action: "rebuild-all-plugins"
      }
    ]
  },
  {
    id: "view",
    label: "보기",
    key: "V",
    items: [
      {
        label: "확대",
        action: "zoom-in",
        shortcut: "Ctrl+=",
        editorAction: true
      },
      {
        label: "축소",
        action: "zoom-out",
        shortcut: "Ctrl+-",
        editorAction: true
      },
      {
        label: "화면에 맞추기",
        action: "zoom-fit",
        shortcut: "Ctrl+0",
        editorAction: true
      },
      { type: "separator" },
      {
        label: "편집기 새로고침",
        action: "reload-editor",
        shortcut: "Ctrl+R"
      }
    ]
  }
] as const satisfies Menu[];

type Menu = {
  id: string;
  label: string;
  items: EditorMenuItem[];
  key: string;
};

type EditorMenuItem =
  | {
      type?: "button";
      label: string;
      action: string;
      shortcut?: string;
      editorAction?: boolean;
    }
  | {
      type: "separator";
    };

export type EditorMenuTopId = (typeof EditorMenu)[number]["id"];

export type EditorMenuAction<For extends "main" | "editor"> = {
  [Menu in (typeof EditorMenu)[number] as Menu["id"]]: `${Menu["id"]}:${Extract<
    Menu["items"][number],
    {
      action: string;
    } & (For extends "editor" ? { editorAction: true } : { editorAction?: false })
  >["action"]}`;
}[(typeof EditorMenu)[number]["id"]];

export function fromEditorMenu<For extends "main" | "editor", MenuType, ItemType>(
  itemMap: (item: EditorMenuItem, action: EditorMenuAction<For> | null) => ItemType,
  menuMap: (menu: Override<Menu, { items: ItemType[] }>) => MenuType
) {
  return EditorMenu.map((m) =>
    menuMap({
      ...m,
      items: m.items.map((item) =>
        itemMap(item, "action" in item ? (`${m.id}:${item.action}` as EditorMenuAction<For>) : null)
      )
    })
  );
}
