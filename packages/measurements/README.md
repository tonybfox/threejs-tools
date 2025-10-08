# Three.js Measurements Tool

A modular measurement utility for Three.js scenes that allows users to measure distances interactively or programmatically, with snapping, live previews, and label overlays.

## Features

✨ **Comprehensive Measurement Capabilities**

- Programmatic measurement creation with `addMeasurement(start, end)`
- Interactive click-based measurement mode
- Real-time distance calculation and display

🎯 **CAD-Style Interactions**

- Click-to-start and click-to-end workflow
- ESC to cancel current measurement
- Visual preview line during measurement creation

📏 **Advanced Snapping**

- Snap to vertices, faces, or edges
- Configurable snap distance threshold
- Visual feedback for snapping

🏷️ **Professional Labels**

- HTML-based text labels using CSS2DObject
- Positioned at measurement midpoints
- Customizable colors and fonts
- Always rendered on top of 3D objects

📊 **Lifecycle Management**

- Undo last measurement
- Remove specific measurements
- Clear all measurements
- Export/import measurements as JSON

## Installation

```bash
npm install @tonybfox/three-measurements
# or
pnpm add @tonybfox/three-measurements
# or
yarn add @tonybfox/three-measurements
```

## Basic Usage

**Important**: This tool uses CSS2DObject for labels, which requires CSS2DRenderer to be set up alongside your main WebGL renderer.

```typescript
import { MeasurementTool } from '@tonybfox/three-measurements'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import * as THREE from 'three'

// Set up CSS2DRenderer for measurement labels
const css2dRenderer = new CSS2DRenderer()
css2dRenderer.setSize(window.innerWidth, window.innerHeight)
css2dRenderer.domElement.style.position = 'absolute'
css2dRenderer.domElement.style.top = '0'
css2dRenderer.domElement.style.pointerEvents = 'none'
document.body.appendChild(css2dRenderer.domElement)

// Initialize measurement tool
const tool = new MeasurementTool(scene, camera)

// Add measurement programmatically
tool.addMeasurement(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 3))

// Enable interactive mode
tool.enableInteraction(renderer.domElement, [groundMesh])

// In your animation loop
function animate() {
  renderer.render(scene, camera) // WebGL rendering
  css2dRenderer.render(scene, camera) // CSS2D label rendering
}

// Listen for events
tool.addEventListener('measurementCreated', (e) => {
  console.log('New measurement:', e.measurement.distance)
})
```

## Interactive Mode

```typescript
// Enable interactive measurement mode
const targetObjects = [mesh1, mesh2, mesh3] // Objects to measure against
tool.enableInteraction(renderer.domElement, targetObjects)

// Disable when done
tool.disableInteraction()
```

## Configuration Options

```typescript
const tool = new MeasurementTool(scene, camera, {
  snapEnabled: true,
  snapDistance: 0.05, // world-space threshold
  previewColor: 0x00ffff, // cyan preview line
  lineColor: 0xff0000, // red measurement lines
  labelColor: 'yellow', // yellow text labels
  lineWidth: 2,
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
})

// Or configure at runtime
tool.snapEnabled = true
tool.snapDistance = 0.05
tool.previewColor = 0x00ffff
tool.labelColor = 'yellow'
```

## Snapping Modes

```typescript
import { SnapMode } from '@tonybfox/three-measurements'

tool.snapMode = SnapMode.VERTEX // Snap to nearest vertex
tool.snapMode = SnapMode.FACE // Snap to face intersections
tool.snapMode = SnapMode.EDGE // Snap to edges (future)
tool.snapMode = SnapMode.DISABLED // No snapping
```

## Event Handling

```typescript
// Measurement lifecycle events
tool.addEventListener('measurementCreated', (e) => {
  console.log('Created:', e.measurement)
})

tool.addEventListener('measurementRemoved', (e) => {
  console.log('Removed:', e.measurement)
})

tool.addEventListener('measurementsCleared', (e) => {
  console.log('Cleared count:', e.count)
})

// Interactive mode events
tool.addEventListener('started', () => {
  console.log('Interactive mode started')
})

tool.addEventListener('ended', () => {
  console.log('Interactive mode ended')
})

tool.addEventListener('previewUpdated', (e) => {
  console.log('Preview distance:', e.distance)
})
```

## Data Management

```typescript
// Get all measurements
const measurements = tool.getMeasurements()

// Remove specific measurement
tool.removeMeasurement(measurement)

// Undo last measurement
tool.undoLast()

// Clear all measurements
tool.clearAll()

// Export to JSON
const data = tool.serialize()
localStorage.setItem('measurements', JSON.stringify(data))

// Import from JSON
const savedData = JSON.parse(localStorage.getItem('measurements'))
tool.deserialize(savedData)
```

## API Reference

### Constructor

```typescript
constructor(scene: THREE.Scene, camera: THREE.Camera, options?: MeasurementToolOptions)
```

### Methods

#### `addMeasurement(start: THREE.Vector3, end: THREE.Vector3): Measurement`

Creates a new measurement programmatically.

#### `enableInteraction(domElement: HTMLElement, targets?: THREE.Object3D[]): void`

Enables interactive click-based measurement mode.

#### `disableInteraction(): void`

Disables interactive mode and cleans up event listeners.

#### `undoLast(): void`

Removes the most recently created measurement.

#### `removeMeasurement(measurement: Measurement): void`

Removes a specific measurement from the scene.

#### `clearAll(): void`

Removes all measurements from the scene.

#### `getMeasurements(): Measurement[]`

Returns array of all current measurements.

#### `serialize(): MeasurementData[]`

Exports measurements to JSON-serializable format.

#### `deserialize(data: MeasurementData[]): void`

Imports measurements from JSON data.

#### `dispose(): void`

Cleans up all resources and event listeners.

### Types

#### `Measurement`

```typescript
interface Measurement {
  id: string
  start: THREE.Vector3
  end: THREE.Vector3
  line: THREE.Line
  label: THREE.Sprite
  distance: number
}
```

#### `MeasurementData`

```typescript
interface MeasurementData {
  id: string
  start: [number, number, number]
  end: [number, number, number]
  distance: number
}
```

#### `MeasurementToolOptions`

```typescript
interface MeasurementToolOptions {
  snapEnabled?: boolean
  snapDistance?: number
  previewColor?: number
  lineColor?: number
  labelColor?: string
  lineWidth?: number
  fontSize?: number
  fontFamily?: string
}
```

## Example Data Format

```json
[
  {
    "id": "measurement_1696800000000_abc123",
    "start": [0, 0, 0],
    "end": [2.1, 0.0, 1.9],
    "distance": 2.83
  },
  {
    "id": "measurement_1696800001000_def456",
    "start": [1, 0, 1],
    "end": [1, 2, 1],
    "distance": 2.0
  }
]
```

## Interactive Controls

When interactive mode is enabled:

- **Left Click**: Place measurement points
- **Mouse Move**: Preview line follows cursor
- **ESC Key**: Cancel current measurement
- **Target Objects**: Only specified objects can be measured

## Performance Notes

- Labels use canvas textures for optimal rendering
- Measurements are efficiently stored and managed
- Proper disposal prevents memory leaks
- Raycasting is optimized for target objects only

## Future Enhancements

- **Angle Measurements**: Between 3 points or 2 lines
- **Area Measurements**: Multi-point polygon areas
- **Height Mode**: Automatic ground-to-object measurements
- **Measurement Groups**: Organize related measurements
- **Advanced Snapping**: Edge detection and custom snap points

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
