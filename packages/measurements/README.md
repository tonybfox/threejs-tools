# Three.js Measurements Tool

A modular measurement utility for Three.js scenes that allows users to measure distances interactively or programmatically, with snapping, live previews, and label overlays.

## Features

✨ **Comprehensive Measurement Capabilities**

- Programmatic measurement creation with `addMeasurement(start, end)`
- Interactive click-based measurement mode
- Real-time distance calculation and display
- **Edit mode** - Modify existing measurements by dragging endpoints

🎯 **CAD-Style Interactions**

- Click-to-start and click-to-end workflow
- ESC to cancel current measurement
- Visual preview line during measurement creation
- **Double-click labels to enter edit mode**
- **Drag edit points with snapping support**

📏 **Advanced Snapping**

- Snap to vertices, faces, or edges
- Configurable snap distance threshold
- Visual feedback for snapping

🏷️ **Professional Labels**

- HTML-based text labels using CSS2DObject
- Positioned at measurement midpoints
- Customizable colors and fonts
- Always rendered on top of 3D objects
- **Interactive labels with double-click to edit**

📊 **Lifecycle Management**

- Undo last measurement
- Remove specific measurements
- Clear all measurements
- Export/import measurements as JSON
- **Edit measurements after creation**

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
tool.enableInteraction({ targets: [groundMesh] })

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
tool.enableInteraction({ targets: targetObjects })

// Disable when done
tool.disableInteraction()
```

## Edit Mode

The measurement tool includes an edit mode that allows users to modify existing measurements by dragging their endpoints.

### Entering Edit Mode

There are two ways to enter edit mode:

1. **Programmatically** - by calling `enterEditMode()` with a measurement ID or index:

```typescript
// Enter edit mode by measurement ID
const measurement = tool.addMeasurement(start, end)
tool.enterEditMode(measurement.id)

// Or by index
tool.enterEditMode(0) // Edit the first measurement
```

2. **Interactively** - by double-clicking on any measurement label:

```typescript
// Labels are automatically interactive when created
// Users can simply double-click any label to enter edit mode
```

### Edit Mode Behavior

When edit mode is active:

- **Orange dots** (edit sprites) appear at the measurement's start and end points
- Clicking and dragging an edit point:
  - Hides the dot sprite
  - Shows the crosshair snap marker
  - Updates the measurement preview in real-time
  - Applies snapping if enabled
- Releasing the mouse button:
  - Updates the measurement point position
  - Recalculates the distance
  - Updates the visual representation
  - Makes the edit sprites visible again

### Exiting Edit Mode

```typescript
// Programmatically exit edit mode
tool.exitEditMode()

// Edit mode also exits automatically when:
// - Another measurement enters edit mode
// - Interactive mode is disabled
// - The tool is disposed
```

### Edit Mode Events

```typescript
tool.addEventListener('editModeEntered', (e) => {
  console.log('Editing measurement:', e.measurement.id)
})

tool.addEventListener('editModeExited', (e) => {
  console.log('Stopped editing:', e.measurement.id)
})

tool.addEventListener('measurementUpdated', (e) => {
  console.log(
    'Measurement updated:',
    e.measurement.id,
    'New distance:',
    e.measurement.distance
  )
})
```

## Configuration Options

```typescript
const tool = new MeasurementTool(scene, camera, {
  domElement: renderer.domElement,
  controls,
})

// Configure defaults that future measurements (and the active interaction session) should use
tool.setDefaultMeasurementOptions({
  snapEnabled: true,
  snapDistance: 0.05, // world-space threshold
  snapMode: SnapMode.VERTEX,
  lineColor: 0xff0000, // red measurement lines
  labelColor: '#ffff00', // yellow text labels
  lineWidth: 2,
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
})

// Visual-only settings remain properties on the tool
tool.previewColor = 0x00ffff
```

## Snapping Modes

```typescript
import { SnapMode } from '@tonybfox/three-measurements'

tool.setDefaultMeasurementOptions({ snapMode: SnapMode.VERTEX })
tool.setDefaultMeasurementOptions({ snapMode: SnapMode.FACE })
tool.setDefaultMeasurementOptions({ snapMode: SnapMode.DISABLED })
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

// Edit mode events
tool.addEventListener('editModeEntered', (e) => {
  console.log('Editing:', e.measurement.id)
})

tool.addEventListener('editModeExited', (e) => {
  console.log('Stopped editing:', e.measurement.id)
})

tool.addEventListener('measurementUpdated', (e) => {
  console.log('Updated:', e.measurement.id, 'Distance:', e.measurement.distance)
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

#### `addMeasurement(start: THREE.Vector3, end: THREE.Vector3, options?: MeasurementCreationOptions): Measurement`

Creates a new measurement programmatically using world-space positions. Provide `startObject`/`endObject` (and optional local offsets) in `options` when the measurement should follow scene objects over time. Visual styling and snapping behaviour can also be supplied per measurement through `options`.

#### `enableInteraction(options?: MeasurementCreationOptions): void`

Enables interactive click-based measurement mode. You can pass any of the creation options (targets, snapping configuration, line/label styling, `isDynamic`, etc.). Omitted values fall back to the tool's defaults.

#### `disableInteraction(): void`

Disables interactive mode and cleans up event listeners.

#### `undoLast(): void`

Removes the most recently created measurement.

#### `removeMeasurement(measurement: Measurement): void`

Removes a specific measurement from the scene.

#### `clearAll(): void`

Removes all measurements from the scene.

#### `getMeasurements(): Measurement[]`

Returns an array of all current measurements.

#### `enterEditMode(measurementIdOrIndex: string | number): void`

Enters edit mode for a specific measurement. Shows draggable edit sprites at the measurement endpoints. The measurement can be specified by ID (string) or by index (number). Optional snapping targets can be passed as the second argument.

#### `exitEditMode(): void`

Exits the current edit mode and removes edit sprites.

#### `serialize(): MeasurementData[]`

Exports measurements to a JSON-serializable format (including styling and snapping preferences).

#### `deserialize(data: MeasurementData[]): void`

Imports measurements from JSON data.

#### `setDefaultMeasurementOptions(options: Partial<MeasurementCreationOptions>): void`

Updates the defaults used for future measurements and the active interaction session (if one is running).

#### `setDynamicMode(enabled: boolean): void`

Shorthand to toggle the default `isDynamic` flag for interactive measurements.

#### `dispose(): void`

Cleans up all resources and event listeners.

### Types

#### `Measurement`

```typescript
interface Measurement {
  id: string
  start: MeasurementPoint
  end: MeasurementPoint
  line: THREE.Line
  label: CSS2DObject
  distance: number
  options: MeasurementOptions
}
```

#### `MeasurementPoint`

```typescript
interface MeasurementPoint {
  position: THREE.Vector3
  anchor?: {
    object: THREE.Object3D
    localPosition: THREE.Vector3
  }
}
```

#### `MeasurementOptions`

```typescript
interface MeasurementOptions {
  lineColor: number
  labelColor: string
  lineWidth: number
  fontSize: number
  fontFamily: string
  snapMode: SnapMode
  snapEnabled: boolean
  snapDistance: number
  targets: THREE.Object3D[]
  isDynamic: boolean
}
```

#### `MeasurementCreationOptions`

```typescript
interface MeasurementCreationOptions {
  id?: string
  targets?: THREE.Object3D[]
  snapEnabled?: boolean
  snapDistance?: number
  snapMode?: SnapMode
  lineColor?: number
  labelColor?: string
  lineWidth?: number
  fontSize?: number
  fontFamily?: string
  isDynamic?: boolean
  startObject?: THREE.Object3D
  startLocalPosition?: THREE.Vector3
  endObject?: THREE.Object3D
  endLocalPosition?: THREE.Vector3
}
```

#### `MeasurementData`

```typescript
interface MeasurementData {
  id: string
  start: {
    position: [number, number, number]
    anchorObjectId?: string
    anchorLocalPosition?: [number, number, number]
  }
  end: {
    position: [number, number, number]
    anchorObjectId?: string
    anchorLocalPosition?: [number, number, number]
  }
  distance: number
  options: {
    snapMode: SnapMode
    snapEnabled: boolean
    snapDistance: number
    lineColor: number
    labelColor: string
    lineWidth: number
    fontSize: number
    fontFamily: string
    isDynamic: boolean
    targetObjectIds?: string[]
  }
}
```

#### `MeasurementToolOptions`

```typescript
interface MeasurementToolOptions {
  domElement?: HTMLElement
  controls?: { enabled: boolean }
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
- **Double-Click Label**: Enter edit mode for that measurement
- **Target Objects**: Only specified objects can be measured

When in edit mode:

- **Drag Edit Point (orange dot)**: Move measurement endpoint with snapping
- **Mouse Move while Dragging**: Update measurement preview in real-time
- **Release Mouse**: Confirm new position and update measurement

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
