export interface SortableProps {
  id: string;
  remove(): unknown;
  onpointerdown(evt: PointerEvent): unknown;
  noGrab?: boolean;
}
