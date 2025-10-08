import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'

/**
 * Represents a single measurement in the scene
 */
export interface Measurement {
  /** Starting point of the measurement */
  start: THREE.Vector3
  /** Ending point of the measurement */
  end: THREE.Vector3
  /** The line geometry representing the measurement */
  line: THREE.Line
  /** The CSS2D label showing the distance */
  label: CSS2DObject
  /** The calculated distance between start and end points */
  distance: number
  /** Unique identifier for the measurement */
  id: string
}

/**
 * Serializable measurement data for export/import
 */
export interface MeasurementData {
  /** Starting point as array [x, y, z] */
  start: [number, number, number]
  /** Ending point as array [x, y, z] */
  end: [number, number, number]
  /** Calculated distance */
  distance: number
  /** Unique identifier */
  id: string
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
