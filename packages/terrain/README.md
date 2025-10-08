# Three.js Terrain Tool

A terrain mesh creator for Three.js scenes that fetches real elevation data and creates 3D terrain meshes with optional imagery overlay.

## Features

- **Real Elevation Data**: Fetches elevation data from Open-Elevation API
- **Configurable Resolution**: Adjust mesh segments for detail vs performance
- **Elevation Scaling**: Control vertical exaggeration
- **Texture Support**: Optional imagery overlay
- **Event System**: Track loading progress and errors
- **Easy Updates**: Change location and size dynamically
- **Automatic Cleanup**: Proper resource disposal

## Installation

```bash
npm install @tonybfox/threejs-terrain three
```

## Basic Usage

```javascript
import * as THREE from 'three'
import { TerrainTool } from '@tonybfox/threejs-terrain'

// Create scene
const scene = new THREE.Scene()

// Create terrain tool
const terrainTool = new TerrainTool(scene, {
  widthSegments: 100,
  depthSegments: 100,
  elevationScale: 2.0,
  baseColor: 0x8b7355,
  useDemoData: false, // Set to true for demo/testing without API
})

// Load terrain for a location
terrainTool.loadTerrain(
  { latitude: 36.1699, longitude: -115.1398 }, // Las Vegas
  { width: 5000, depth: 5000 } // 5km x 5km area
)
```

## Demo Mode

For testing or environments where the elevation API is blocked, use demo mode:

```javascript
const terrainTool = new TerrainTool(scene, {
  useDemoData: true, // Generates synthetic terrain data
  widthSegments: 50,
  depthSegments: 50,
  elevationScale: 2.0,
})
```

## Configuration Options

```typescript
interface TerrainToolOptions {
  widthSegments?: number // Default: 50
  depthSegments?: number // Default: 50
  elevationScale?: number // Default: 1.0
  baseColor?: number // Default: 0x8B7355
  wireframe?: boolean // Default: false
  textureUrl?: string // Optional texture overlay
  receiveShadow?: boolean // Default: true
  castShadow?: boolean // Default: true
  useDemoData?: boolean // Default: false - Use synthetic data instead of API
}
```

## Event Handling

The terrain tool dispatches events for various operations:

```javascript
// Data loaded from API
terrainTool.addEventListener('dataLoaded', (event) => {
  console.log('Terrain data:', event.data)
  console.log('Elevation range:', event.data.minElevation, '-', event.data.maxElevation)
})

// Mesh created and added to scene
terrainTool.addEventListener('meshLoaded', (event) => {
  console.log('Terrain mesh:', event.mesh)
})

// Update started
terrainTool.addEventListener('updateStarted', (event) => {
  console.log('Loading terrain at:', event.center)
})

// Error occurred
terrainTool.addEventListener('error', (event) => {
  console.error('Error:', event.message, event.error)
})
```

## Dynamic Updates

```javascript
// Update location
terrainTool.updateTerrain(
  { latitude: 40.7128, longitude: -74.0060 }, // New York
  { width: 3000, depth: 3000 }
)

// Update size only (keeps current location)
terrainTool.updateTerrain(undefined, { width: 10000, depth: 10000 })

// Update location only (keeps current size)
terrainTool.updateTerrain({ latitude: 51.5074, longitude: -0.1278 })
```

## API Reference

### Constructor

```typescript
constructor(scene: THREE.Scene, options?: TerrainToolOptions)
```

### Methods

#### `loadTerrain(center: GeoCoordinates, dimensions: TerrainDimensions): Promise<void>`

Loads terrain data and creates a mesh.

#### `updateTerrain(center?: GeoCoordinates, dimensions?: TerrainDimensions): Promise<void>`

Updates the terrain with new coordinates and/or dimensions.

#### `getMesh(): THREE.Mesh | null`

Returns the current terrain mesh.

#### `getData(): TerrainData | null`

Returns the current terrain data.

#### `isTerrainLoading(): boolean`

Checks if terrain is currently loading.

#### `dispose(): void`

Cleans up all resources and removes mesh from scene.

### Types

#### `GeoCoordinates`

```typescript
interface GeoCoordinates {
  latitude: number
  longitude: number
}
```

#### `TerrainDimensions`

```typescript
interface TerrainDimensions {
  width: number // meters
  depth: number // meters
}
```

#### `TerrainData`

```typescript
interface TerrainData {
  center: GeoCoordinates
  dimensions: TerrainDimensions
  elevations: number[][] // 2D grid of elevation values
  minElevation: number
  maxElevation: number
}
```

## Example: With Texture Overlay

```javascript
const terrainTool = new TerrainTool(scene, {
  widthSegments: 100,
  depthSegments: 100,
  elevationScale: 1.5,
  textureUrl: '/path/to/satellite-imagery.jpg',
})

terrainTool.loadTerrain(
  { latitude: 36.1699, longitude: -115.1398 },
  { width: 5000, depth: 5000 }
)
```

## Notes

- The Open-Elevation API has rate limits. For production use, consider caching results or using a different elevation API
- Large terrain areas or high segment counts may take longer to load
- Elevation scale of 1.0 means 1 meter elevation = 1 Three.js unit
- The mesh is positioned at the scene origin; adjust position as needed
- Use lower segment counts for better performance, higher for more detail

## Future Enhancements

- **Multiple Data Sources**: Support for different elevation APIs
- **LOD Support**: Level of detail optimization
- **Terrain Stitching**: Combine multiple terrain tiles
- **Biome Texturing**: Automatic texture selection based on elevation
- **Water Bodies**: Detect and render water features

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
