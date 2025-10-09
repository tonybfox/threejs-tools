import * as THREE from 'three'
import {
  GeoCoordinates,
  TerrainDimensions,
  TerrainToolOptions,
  TerrainData,
  TerrainToolEvents,
  ElevationPoint,
  MapboxTextureOptions,
} from './TerrainTypes'

type TerrainTextureSource = {
  url: string
  revokeOnUse: boolean
}

/**
 * Terrain mesh creator for Three.js scenes
 * Fetches elevation data from Open-Elevation API and creates 3D terrain meshes
 *
 * @example
 * ```javascript
 * const terrainTool = new TerrainTool(scene, {
 *   widthSegments: 100,
 *   depthSegments: 100,
 *   elevationScale: 2.0,
 *   useDemoData: false // Set to true for demo/testing without API
 * })
 *
 * // Listen for events
 * terrainTool.addEventListener('dataLoaded', (e) => {
 *   console.log('Terrain data loaded:', e.data)
 * })
 *
 * terrainTool.addEventListener('meshLoaded', (e) => {
 *   console.log('Terrain mesh created:', e.mesh)
 * })
 *
 * // Load terrain for a location
 * terrainTool.loadTerrain(
 *   { latitude: 36.1699, longitude: -115.1398 }, // Las Vegas
 *   { width: 5000, depth: 5000 } // 5km x 5km
 * )
 * ```
 */
export class TerrainTool extends THREE.EventDispatcher<TerrainToolEvents> {
  private scene: THREE.Scene
  private mesh: THREE.Mesh | null = null
  private currentData: TerrainData | null = null
  private isLoading: boolean = false
  private mapboxOptions?: MapboxTextureOptions
  private generatedTextureUrls: Set<string> = new Set()

  // Configuration
  public widthSegments: number
  public depthSegments: number
  public elevationScale: number
  public baseColor: number
  public wireframe: boolean
  public textureUrl: string | undefined
  public receiveShadow: boolean
  public castShadow: boolean
  public useDemoData: boolean

  /**
   * Creates a new TerrainTool instance
   * @param scene - The Three.js scene to add terrain to
   * @param options - Configuration options
   */
  constructor(scene: THREE.Scene, options: TerrainToolOptions = {}) {
    super()
    this.scene = scene

    // Apply options with defaults
    this.widthSegments = options.widthSegments ?? 50
    this.depthSegments = options.depthSegments ?? 50
    this.elevationScale = options.elevationScale ?? 1.0
    this.baseColor = options.baseColor ?? 0x8b7355
    this.wireframe = options.wireframe ?? false
    this.textureUrl = options.textureUrl
    this.mapboxOptions = options.mapbox
    this.receiveShadow = options.receiveShadow ?? true
    this.castShadow = options.castShadow ?? true
    this.useDemoData = options.useDemoData ?? false
  }

  /**
   * Update Mapbox imagery configuration at runtime
   */
  setMapboxOptions(options?: MapboxTextureOptions): void {
    this.mapboxOptions = options
  }

  /**
   * Loads terrain data and creates a mesh
   * @param center - Center coordinates (latitude, longitude)
   * @param dimensions - Terrain dimensions in meters
   */
  async loadTerrain(
    center: GeoCoordinates,
    dimensions: TerrainDimensions
  ): Promise<void> {
    if (this.isLoading) {
      console.warn('Terrain is already loading')
      return
    }

    this.isLoading = true
    this.dispatchEvent({
      type: 'updateStarted',
      center,
      dimensions,
    })

    try {
      // Fetch elevation data
      const terrainData = await this.fetchElevationData(center, dimensions)

      // Store the data
      this.currentData = terrainData

      // Dispatch data loaded event
      this.dispatchEvent({
        type: 'dataLoaded',
        data: terrainData,
      })

      const textureSource = await this.resolveTexture(center, dimensions)

      // Create and add mesh to scene
      await this.createMesh(terrainData, textureSource)
    } catch (error) {
      console.error('Error loading terrain:', error)
      this.dispatchEvent({
        type: 'error',
        message: 'Failed to load terrain',
        error: error as Error,
      })
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Updates the terrain with new coordinates and/or dimensions
   * @param center - New center coordinates (optional, keeps current if not provided)
   * @param dimensions - New dimensions (optional, keeps current if not provided)
   */
  async updateTerrain(
    center?: GeoCoordinates,
    dimensions?: TerrainDimensions
  ): Promise<void> {
    if (!this.currentData && !center) {
      console.warn('No current terrain data and no center provided')
      return
    }

    const newCenter = center || this.currentData!.center
    const newDimensions = dimensions || this.currentData!.dimensions

    await this.loadTerrain(newCenter, newDimensions)
  }

  /**
   * Fetches elevation data from Open-Elevation API or generates demo data
   * @private
   */
  private async fetchElevationData(
    center: GeoCoordinates,
    dimensions: TerrainDimensions
  ): Promise<TerrainData> {
    if (this.useDemoData) {
      return this.generateDemoData(center, dimensions)
    }

    // Calculate grid of lat/lon points
    const points: { latitude: number; longitude: number }[] = []

    // Approximate degrees per meter at this latitude
    const metersPerDegreeLat = 111320
    const metersPerDegreeLon =
      111320 *
      Math.max(
        Math.abs(Math.cos((center.latitude * Math.PI) / 180)),
        1e-6
      )

    const latRange = dimensions.depth / metersPerDegreeLat
    const lonRange = dimensions.width / metersPerDegreeLon

    const latStep = latRange / this.depthSegments
    const lonStep = lonRange / this.widthSegments

    const startLat = center.latitude + latRange / 2
    const startLon = center.longitude - lonRange / 2

    // Create grid of points
    for (let z = 0; z <= this.depthSegments; z++) {
      for (let x = 0; x <= this.widthSegments; x++) {
        points.push({
          latitude: startLat - z * latStep,
          longitude: startLon + x * lonStep,
        })
      }
    }

    // Fetch elevation data from Open-Elevation API
    // Note: This API has rate limits and may not work for large requests
    // In production, you might want to use a different API or cache results
    const response = await fetch(
      'https://api.open-elevation.com/api/v1/lookup',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations: points,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Elevation API error: ${response.statusText}`)
    }

    const data = await response.json()
    const results: ElevationPoint[] = data.results

    // Convert to 2D grid
    const elevations: number[][] = []
    let minElevation = Infinity
    let maxElevation = -Infinity

    for (let z = 0; z <= this.depthSegments; z++) {
      const row: number[] = []
      for (let x = 0; x <= this.widthSegments; x++) {
        const index = z * (this.widthSegments + 1) + x
        const elevation = results[index].elevation
        row.push(elevation)
        minElevation = Math.min(minElevation, elevation)
        maxElevation = Math.max(maxElevation, elevation)
      }
      elevations.push(row)
    }

    return {
      center,
      dimensions,
      elevations,
      minElevation,
      maxElevation,
    }
  }

  /**
   * Generates demo terrain data using perlin-like noise
   * @private
   */
  private generateDemoData(
    center: GeoCoordinates,
    dimensions: TerrainDimensions
  ): TerrainData {
    const elevations: number[][] = []
    let minElevation = Infinity
    let maxElevation = -Infinity

    // Simple sine-based terrain generation for demo
    const seed = center.latitude + center.longitude
    for (let z = 0; z <= this.depthSegments; z++) {
      const row: number[] = []
      for (let x = 0; x <= this.widthSegments; x++) {
        // Create varied terrain using multiple sine waves
        const nx = (x / this.widthSegments) * 4
        const nz = (z / this.depthSegments) * 4

        let elevation = 0
        // Large features
        elevation += Math.sin(nx + seed) * 500
        elevation += Math.cos(nz + seed) * 500
        // Medium features
        elevation += Math.sin(nx * 2 + seed) * 200
        elevation += Math.cos(nz * 2 + seed) * 200
        // Small features
        elevation += Math.sin(nx * 4 + seed) * 50
        elevation += Math.cos(nz * 4 + seed) * 50
        // Random noise
        elevation += (Math.random() - 0.5) * 30

        row.push(elevation)
        minElevation = Math.min(minElevation, elevation)
        maxElevation = Math.max(maxElevation, elevation)
      }
      elevations.push(row)
    }

    return {
      center,
      dimensions,
      elevations,
      minElevation,
      maxElevation,
    }
  }

  /**
   * Creates a terrain mesh from elevation data
   * @private
   */
  private async createMesh(
    data: TerrainData,
    textureSource?: TerrainTextureSource
  ): Promise<void> {
    // Remove existing mesh if any
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((mat) => mat.dispose())
      } else {
        this.mesh.material.dispose()
      }
    }

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(
      data.dimensions.width,
      data.dimensions.depth,
      this.widthSegments,
      this.depthSegments
    )

    // Apply elevation data to geometry vertices
    const positions = geometry.attributes.position
    let vertexIndex = 0

    for (let z = 0; z <= this.depthSegments; z++) {
      for (let x = 0; x <= this.widthSegments; x++) {
        const elevation = data.elevations[z][x]
        // Normalize elevation relative to min elevation
        const height = (elevation - data.minElevation) * this.elevationScale
        positions.setZ(vertexIndex, height)
        vertexIndex++
      }
    }

    // Recompute normals for proper lighting
    geometry.computeVertexNormals()

    // Create material
    let material: THREE.Material

    if (textureSource?.url) {
      try {
        const texture = await new THREE.TextureLoader().loadAsync(
          textureSource.url
        )
        material = new THREE.MeshStandardMaterial({
          map: texture,
          wireframe: this.wireframe,
        })
      } catch (error) {
        console.warn('Failed to load terrain texture, using base color.', error)
        material = new THREE.MeshStandardMaterial({
          color: this.baseColor,
          wireframe: this.wireframe,
        })
      } finally {
        if (textureSource.revokeOnUse) {
          this.releaseGeneratedTexture(textureSource.url)
        }
      }
    } else {
      material = new THREE.MeshStandardMaterial({
        color: this.baseColor,
        wireframe: this.wireframe,
      })
    }

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.rotation.x = -Math.PI / 2 // Rotate to horizontal
    this.mesh.receiveShadow = this.receiveShadow
    this.mesh.castShadow = this.castShadow

    // Add to scene
    this.scene.add(this.mesh)

    // Dispatch mesh loaded event
    this.dispatchEvent({
      type: 'meshLoaded',
      mesh: this.mesh,
    })
  }

  private async resolveTexture(
    center: GeoCoordinates,
    dimensions: TerrainDimensions
  ): Promise<TerrainTextureSource | undefined> {
    if (this.textureUrl) {
      return {
        url: this.textureUrl,
        revokeOnUse: false,
      }
    }

    if (!this.mapboxOptions) {
      return undefined
    }

    try {
      const url = await this.fetchMapboxTexture(
        center,
        dimensions,
        this.mapboxOptions
      )
      this.generatedTextureUrls.add(url)
      return {
        url,
        revokeOnUse: true,
      }
    } catch (error) {
      console.warn(
        'Failed to fetch Mapbox imagery, falling back to base material.',
        error
      )
      return undefined
    }
  }

  private computeBoundingBox(
    center: GeoCoordinates,
    dimensions: TerrainDimensions,
    paddingRatio: number
  ): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
    const metersPerDegreeLat = 111320
    const latRadians = (center.latitude * Math.PI) / 180
    const cosLat = Math.cos(latRadians)
    const metersPerDegreeLon = 111320 * Math.max(Math.abs(cosLat), 1e-6)

    const appliedPadding = Math.max(0, paddingRatio)
    const widthWithPadding = dimensions.width * (1 + appliedPadding)
    const depthWithPadding = dimensions.depth * (1 + appliedPadding)

    const halfDepthDegrees = (depthWithPadding / 2) / metersPerDegreeLat
    const halfWidthDegrees = (widthWithPadding / 2) / metersPerDegreeLon

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max)

    const minLat = clamp(center.latitude - halfDepthDegrees, -90, 90)
    const maxLat = clamp(center.latitude + halfDepthDegrees, -90, 90)
    const minLon = clamp(center.longitude - halfWidthDegrees, -180, 180)
    const maxLon = clamp(center.longitude + halfWidthDegrees, -180, 180)

    return { minLat, maxLat, minLon, maxLon }
  }

  private async fetchMapboxTexture(
    center: GeoCoordinates,
    dimensions: TerrainDimensions,
    options: MapboxTextureOptions
  ): Promise<string> {
    const styleId = options.styleId ?? 'mapbox/satellite-v9'
    const normalizedStyleId = styleId
      .replace('mapbox://styles/', '')
      .replace(/^\/+/, '')

    const width = Math.min(
      1280,
      Math.max(1, Math.floor(options.imageWidth ?? 1024))
    )
    const height = Math.min(
      1280,
      Math.max(1, Math.floor(options.imageHeight ?? 1024))
    )
    const highResSuffix = options.highResolution ? '@2x' : ''
    const format = options.imageFormat ?? 'png'
    const paddingRatio = options.paddingRatio ?? 0.1

    const bounds = this.computeBoundingBox(center, dimensions, paddingRatio)
    const bbox = `${bounds.minLon.toFixed(6)},${bounds.minLat.toFixed(
      6
    )},${bounds.maxLon.toFixed(6)},${bounds.maxLat.toFixed(6)}`

    const params = new URLSearchParams({
      access_token: options.accessToken,
      format,
    })

    const requestUrl = `https://api.mapbox.com/styles/v1/${normalizedStyleId}/static/[${bbox}]/${width}x${height}${highResSuffix}?${params.toString()}`

    const response = await fetch(requestUrl)
    if (!response.ok) {
      throw new Error(
        `Mapbox imagery request failed: ${response.status} ${response.statusText}`
      )
    }

    const blob = await response.blob()

    if (
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      throw new Error('URL.createObjectURL is not available in this environment')
    }

    return URL.createObjectURL(blob)
  }

  private releaseGeneratedTexture(url: string): void {
    if (!this.generatedTextureUrls.has(url)) {
      return
    }

    if (
      typeof URL !== 'undefined' &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      URL.revokeObjectURL(url)
    }

    this.generatedTextureUrls.delete(url)
  }

  /**
   * Gets the current terrain mesh
   */
  getMesh(): THREE.Mesh | null {
    return this.mesh
  }

  /**
   * Gets the current terrain data
   */
  getData(): TerrainData | null {
    return this.currentData
  }

  /**
   * Checks if terrain is currently loading
   */
  isTerrainLoading(): boolean {
    return this.isLoading
  }

  /**
   * Disposes of all resources
   */
  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((mat) => mat.dispose())
      } else {
        this.mesh.material.dispose()
      }
      this.mesh = null
    }
    this.currentData = null

    if (this.generatedTextureUrls.size > 0) {
      for (const url of Array.from(this.generatedTextureUrls)) {
        this.releaseGeneratedTexture(url)
      }
    }
  }
}
