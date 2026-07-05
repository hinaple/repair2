import { getExt, getFileType, getResourceTitle, type FileType } from "@shared/resourceUtils";
import type { ResourceHandle } from "@fainthit/repair2-plugin-sdk";
import type { Types } from "@shared/projectData/types";
import { getAssetDir } from "@renderer/utils";

let isPreloaded: (id: string) => boolean;
export function registerIsPreloaded(cb: typeof isPreloaded) {
  isPreloaded = cb;
}

export class Resource {
  id: string;
  alias: string | null;
  src: string;
  path: string;
  ext: string | null;
  fileType: FileType | null;
  title: string | null;

  private _handle?: ResourceHandle;
  constructor(public d: Types.Resource) {
    this.id = d.id;
    this.alias = d.alias;
    this.src = d.src ?? "";
    this.path = getAssetDir(this.src);
    this.ext = getExt(this.src);
    this.fileType = this.src ? getFileType(this.ext) : null;
    this.title = getResourceTitle(d);
  }

  get handle() {
    if (!this._handle) {
      const that = this;
      this._handle = {
        id: that.id,
        title: getResourceTitle(that),
        alias: that.alias,
        type: that.fileType,
        src: that.src,
        path: that.path,
        meta: {
          extension: that.ext,
          get preloaded() {
            return isPreloaded?.(that.id) ?? false;
          }
        }
      };
    }

    return this._handle;
  }
}
