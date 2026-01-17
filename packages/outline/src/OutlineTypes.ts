import * as THREE from 'three'

/**
 * Configuration options for the OutlineTool
 */
export interface OutlineOptions {
  /**
   * Color of the outline (hex)
   * @default 0xff0000
   */
  outlineColor?: number

  /**
   * Thickness of edge lines in pixels (for both modes)
   * @default 2
   */
  edgeLineWidth?: number

  /**
   * Color of edge lines (hex) - only for 'mesh' mode
   * @default 0xff0000
   */
  edgeLineColor?: number

  /**
   * Angle threshold for edge detection (degrees) - only for 'mesh' mode
   * Higher values = fewer edges detected
   * @default 30
   */
  edgeThreshold?: number

  /**
   * Scale multiplier for silhouette outline - only for 'mesh' mode
   * @default 1.02
   */
  outlineScale?: number

  /**
   * Enable silhouette outline (inverted hull) - only for 'mesh' mode
   * @default true
   */
  enableSilhouette?: boolean

  /**
   * Enable edge lines - only for 'mesh' mode
   * @default true
   */
  enableEdgeLines?: boolean

  /**
   * Edge strength for postprocess mode (0-1)
   * @default 1.0
   */
  edgeStrength?: number

  /**
   * Custom exclusion function to filter objects
   * Return true to exclude an object from outlining
   */
  excludeFilter?: (object: THREE.Object3D) => boolean
}

/**
 * Internal data structure for tracking outlined objects
 */
export interface OutlineData {
  originalObject: THREE.Object3D
  silhouetteMesh?: THREE.Mesh
  edgeLines?: any // LineSegments2
  parent: THREE.Object3D
  idColor?: THREE.Color
}
