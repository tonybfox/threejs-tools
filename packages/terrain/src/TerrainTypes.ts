import * as THREE from 'three'

/**
 * Geographic coordinates
 */
export interface GeoCoordinates {
  /** Latitude in degrees */
  latitude: number
  /** Longitude in degrees */
  longitude: number
}

/**
 * Terrain dimensions
 */
export interface TerrainDimensions {
  /** Width in meters */
  width: number
  /** Depth in meters */
  depth: number
}

/**
 * Configuration options for the terrain tool
 */
export interface TerrainToolOptions {
  /** Number of width segments for the terrain mesh (default: 50) */
  widthSegments?: number
  /** Number of depth segments for the terrain mesh (default: 50) */
  depthSegments?: number
  /** Vertical exaggeration factor for elevation (default: 1.0) */
  elevationScale?: number
  /** Base material color (default: 0x8B7355) */
  baseColor?: number
  /** Whether to enable wireframe mode (default: false) */
  wireframe?: boolean
  /** Texture URL for imagery overlay (optional) */
  textureUrl?: string
  /** Whether to receive shadows (default: true) */
  receiveShadow?: boolean
  /** Whether to cast shadows (default: true) */
  castShadow?: boolean
  /** Use demo/synthetic data instead of API (default: false) */
  useDemoData?: boolean
}

/**
 * Elevation data point from API
 */
export interface ElevationPoint {
  /** Latitude */
  latitude: number
  /** Longitude */
  longitude: number
  /** Elevation in meters */
  elevation: number
}

/**
 * Terrain data returned by the API
 */
export interface TerrainData {
  /** Center coordinates */
  center: GeoCoordinates
  /** Dimensions */
  dimensions: TerrainDimensions
  /** Grid of elevation points */
  elevations: number[][]
  /** Minimum elevation in the dataset */
  minElevation: number
  /** Maximum elevation in the dataset */
  maxElevation: number
}

/**
 * Event types dispatched by the terrain tool
 */
export interface TerrainToolEvents {
  /** Dispatched when terrain data has been fetched */
  dataLoaded: { data: TerrainData }
  /** Dispatched when the terrain mesh has been created and added to the scene */
  meshLoaded: { mesh: THREE.Mesh }
  /** Dispatched when terrain update starts */
  updateStarted: { center: GeoCoordinates; dimensions: TerrainDimensions }
  /** Dispatched when an error occurs */
  error: { message: string; error: Error }
}
