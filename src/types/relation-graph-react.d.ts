import type { FC, ReactNode } from "react"

/** Type shim. The published package types are .ts sources that use enums, which this project's compiler rejects. */
export type JsonNode = {
  id: string
  text?: string
  x?: number
  y?: number
  width?: number
  height?: number
  fixed?: boolean
  disableDrag?: boolean
  nodeShape?: number
  color?: string
  borderWidth?: number
  data?: Record<string, unknown>
}

export type JsonLine = {
  id?: string
  from: string
  to: string
  color?: string
  lineShape?: number
  showEndArrow?: boolean
}

export type RGOptions = {
  showToolBar?: boolean
  backgroundColor?: string
  disableDragNode?: boolean
  disableDragLine?: boolean
  wheelEventAction?: "zoom" | "scroll" | "none"
  dragEventAction?: "move" | "selection" | "none"
  defaultExpandHolderPosition?: "hide" | "left" | "top" | "right" | "bottom"
  defaultNodeShape?: number
  defaultNodeBorderWidth?: number
  defaultNodeColor?: string
  defaultNodeBorderColor?: string
  defaultJunctionPoint?: string
  defaultLineShape?: number
  defaultLineColor?: string
  defaultLineWidth?: number
  placeOtherGroup?: boolean
  layout?: { layoutName: string }
}

export type RGNode = {
  id: string
  text?: string
  x: number
  y: number
  width?: number
  height?: number
  data?: Record<string, unknown>
}

export type RGNodeSlotProps = {
  node: RGNode
  dragging?: boolean
  checked?: boolean
}

export declare const RGNodeShape: { readonly circle: 0; readonly rect: 1 }
export declare const RGLineShape: { readonly StandardCurve: 6 }
export declare const RGJunctionPoint: { readonly border: "border" }

type GraphInstance = {
  setJsonData: (data: { rootId?: string; nodes: JsonNode[]; lines: JsonLine[] }) => Promise<void>
  moveToCenter: () => void
  zoomToFit: () => void
  zoom: (delta: number, point?: { x: number; y: number }) => void
  scrollView: (x: number, y: number) => void
  setDom: (element: HTMLElement | null) => void
  updateOptions: (options: RGOptions & { viewSize?: { width: number; height: number } }) => void
}

export declare const RGHooks: {
  useGraphInstance: () => GraphInstance
}

export declare const RGSlotOnNode: FC<{
  children: (props: RGNodeSlotProps) => ReactNode
}>

export declare const RelationGraph: FC<{
  options?: RGOptions
  children?: ReactNode
}>

export declare const RGProvider: FC<{
  children?: ReactNode
}>
