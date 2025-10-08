import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'

/**
 * Defines how a measurement point is attached to a scene object.
 */
export interface MeasurementAnchor {
  /** Object the point is attached to */
  object: THREE.Object3D
  /** Local position relative to the object */
  localPosition: THREE.Vector3
}

/**
 * Represents a measurement point in world space with an optional anchor.
 */
export interface MeasurementPoint {
  /** World position of the measurement point */
  position: THREE.Vector3
  /** Optional attachment data for dynamic updates */
  anchor?: MeasurementAnchor
}

/**
 * Per-measurement configuration captured at creation time.
 */
export interface MeasurementOptions {
  /** Render color for the measurement line */
  lineColor: number
  /** Render color for the measurement label text */
  labelColor: string
  /** Width of the rendered line */
  lineWidth: number
  /** Font size for label text */
  fontSize: number
  /** Font family for label text */
  fontFamily: string
  /** Snapping mode used when the measurement was created */
  snapMode: SnapMode
  /** Whether snapping was enabled for this measurement */
  snapEnabled: boolean
  /** Snap distance threshold for this measurement */
  snapDistance: number
  /** Targets that were considered for snapping */
  targets: THREE.Object3D[]
  /** Whether this measurement should remain linked to scene objects */
  isDynamic: boolean
}

/**
 * Runtime representation of a measurement inside the scene.
 */
export interface Measurement {
  /** Unique identifier for the measurement */
  id: string
  /** Starting point of the measurement */
  start: MeasurementPoint
  /** Ending point of the measurement */
  end: MeasurementPoint
  /** The line geometry representing the measurement */
  line: THREE.Line
  /** The CSS2D label showing the distance */
  label: CSS2DObject
  /** The calculated distance between start and end points */
  distance: number
  /** Config that should be reused when editing this measurement */
  options: MeasurementOptions
}

/**
 * Options accepted when creating or importing a measurement.
 */
export interface MeasurementCreationOptions {
  /** Explicit measurement identifier */
  id?: string
  /** Objects that should be considered for snapping/intersections */
  targets?: THREE.Object3D[]
  /** Whether snapping should be enabled */
  snapEnabled?: boolean
  /** Snap distance threshold */
  snapDistance?: number
  /** Snapping mode */
  snapMode?: SnapMode
  /** Line color */
  lineColor?: number
  /** Label color */
  labelColor?: string
  /** Line width */
  lineWidth?: number
  /** Label font size */
  fontSize?: number
  /** Label font family */
  fontFamily?: string
  /** Whether the measurement should stay linked to objects */
  isDynamic?: boolean
  /** Object the start point should follow */
  startObject?: THREE.Object3D
  /** Local position relative to startObject (defaults to world position converted to local) */
  startLocalPosition?: THREE.Vector3
  /** Object the end point should follow */
  endObject?: THREE.Object3D
  /** Local position relative to endObject (defaults to world position converted to local) */
  endLocalPosition?: THREE.Vector3
}

/**
 * Serializable measurement point data for export/import.
 */
export interface MeasurementPointData {
  /** Position as array [x, y, z] */
  position: [number, number, number]
  /** UUID of the anchor object if the point is dynamic */
  anchorObjectId?: string
  /** Local position relative to the anchor object */
  anchorLocalPosition?: [number, number, number]
}

/**
 * Serializable measurement configuration data.
 */
export interface SerializedMeasurementOptions {
  /** Snapping mode used by the measurement */
  snapMode: SnapMode
  /** Whether snapping was enabled for the measurement */
  snapEnabled: boolean
  /** Snap distance threshold used by the measurement */
  snapDistance: number
  /** Measurement line color */
  lineColor: number
  /** Measurement label color */
  labelColor: string
  /** Measurement line width */
  lineWidth: number
  /** Measurement label font size */
  fontSize: number
  /** Measurement label font family */
  fontFamily: string
  /** Whether the measurement should stay linked to objects */
  isDynamic: boolean
  /** UUIDs of the target objects captured for this measurement */
  targetObjectIds?: string[]
}

/**
 * Serializable measurement data for export/import.
 */
export interface MeasurementData {
  /** Unique identifier */
  id: string
  /** Starting point data */
  start: MeasurementPointData
  /** Ending point data */
  end: MeasurementPointData
  /** Calculated distance */
  distance: number
  /** Captured configuration for the measurement */
  options: SerializedMeasurementOptions
}

/**
 * Configuration options for the measurement tool
 */
export interface MeasurementToolOptions {
  /** DOM element for mouse interactions (required for interactive mode and editing) */
  domElement?: HTMLElement
  /** Camera controls to disable during edit dragging (e.g., OrbitControls) */
  controls?: { enabled: boolean }
}

/**
 * Snapping mode options
 */
export enum SnapMode {
  VERTEX = 'vertex',
  FACE = 'face',
  EDGE = 'edge',
  DISABLED = 'disabled',
}

/**
 * Event types dispatched by the measurement tool
 */
export interface MeasurementToolEvents {
  /** Fired when a new measurement is created */
  measurementCreated: { measurement: Measurement }
  /** Fired when a measurement is removed */
  measurementRemoved: { measurement: Measurement }
  /** Fired when all measurements are cleared */
  measurementsCleared: { count: number }
  /** Fired when interactive mode starts */
  started: {}
  /** Fired when interactive mode ends */
  ended: {}
  /** Fired when preview line is updated */
  previewUpdated: {
    start: THREE.Vector3
    current: THREE.Vector3
    distance: number
  }
  /** Fired when edit mode is entered */
  editModeEntered: { measurement: Measurement }
  /** Fired when edit mode is exited */
  editModeExited: { measurement: Measurement }
  /** Fired when a measurement is updated */
  measurementUpdated: { measurement: Measurement }
}

/**
 * Raycast result with snapping information
 */
export interface SnapResult {
  /** The snapped position */
  point: THREE.Vector3
  /** The original intersection point */
  originalPoint: THREE.Vector3
  /** Whether snapping occurred */
  snapped: boolean
  /** The snap mode that was applied */
  snapMode: SnapMode
  /** The object that was intersected */
  object: THREE.Object3D
}
