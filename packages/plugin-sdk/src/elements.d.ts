export interface RepairAssetAttributes {
  src?: string;
  clone?: boolean | "true" | "false";
  notpreload?: boolean | "true" | "false";
  volume?: number | string;
  loop?: boolean | "true" | "false";
  sizing?: "none" | "width" | "height" | "both";
}
