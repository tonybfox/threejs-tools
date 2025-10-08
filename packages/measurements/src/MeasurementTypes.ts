import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'

/**
 * Represents a measurement point that can be either static (Vector3) or dynamic (attached to an object)
 */
export interface MeasurementPoint {
  /** The current world position (always up-to-date) */
  position: THREE.Vector3
  /** Source object if this point is attached to an object */
  sourceObject?: THREE.Object3D
  /** Local position relative to the source object (if attached) */
  localPosition?: THREE.Vector3
  /** Whether this point is dynamic (attached to an object) */
  isDynamic: boolean
}

/**
 * Represents a single measurement in the scene
 */
export interface Measurement {
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
  /** Unique identifier for the measurement */
  id: string
  /** Whether this measurement has any dynamic points */
  isDynamic: boolean
}

/**
 * Serializable measurement point data for export/import
 */
export interface MeasurementPointData {
  /** Position as array [x, y, z] */
  position: [number, number, number]
  /** Local position relative to source object (if dynamic) */
  localPosition?: [number, number, number]
  /** Whether this point is dynamic */
  isDynamic: boolean
  /** Object identifier for dynamic points (note: objects can't be serialized) */
  objectId?: string
}

/**
 * Serializable measurement data for export/import
 */
export interface MeasurementData {
  /** Starting point data */
  start: MeasurementPointData
  /** Ending point data */
  end: MeasurementPointData
  /** Calculated distance */
  distance: number
  /** Unique identifier */
  id: string
  /** Whether this measurement has any dynamic points */
  isDynamic: boolean
}

/**
 * Configuration options for the measurement tool
 */
export interface MeasurementToolOptions {
  /** Enable snapping to geometry */
  snapEnabled?: boolean
  /** Distance threshold for snapping (world units) */
  snapDistance?: number
  /** Color for the preview line */
  previewColor?: number
  /** Color for measurement lines */
  lineColor?: number
  /** Color for measurement labels */
  labelColor?: string
  /** Width of measurement lines */
  lineWidth?: number
  /** Font size for labels */
  fontSize?: number
  /** Font family for labels */
  fontFamily?: string
  /** Color for the snap marker */
  markerColor?: number
  /** Size of the snap marker (sprite scale) */
  markerSize?: number
  /** Whether to show the snap marker */
  markerVisible?: boolean
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
