# Three.js Transform Controls

Interactive transform controls (translate, rotate, scale) for Three.js objects, similar to the transform gizmo in Blender and Unity.

## Features

- **3D Manipulation Gizmo**: Translate, rotate, and scale objects in 3D space
- **Multiple Modes**: Switch between translate, rotate, and scale modes
- **Axis Constraints**: Lock transformations to specific axes (X, Y, Z)
- **Plane Constraints**: Transform on specific planes (XY, YZ, XZ)
- **Snap Support**: Enable snapping for precise transformations
- **Space Modes**: Work in world or local object space
- **TypeScript Support**: Full type definitions included

## Installation

```bash
npm install @tonybfox/threejs-transform-controls
# or
pnpm add @tonybfox/threejs-transform-controls
# or
yarn add @tonybfox/threejs-transform-controls
```

## Usage

```typescript
import * as THREE from 'three'
import { TransformControls } from '@tonybfox/threejs-transform-controls'

// Create your scene, camera, and renderer
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
const renderer = new THREE.WebGLRenderer()

// Create a mesh to transform
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// Create transform controls
const transformControls = new TransformControls(camera, renderer.domElement)
transformControls.attach(cube)
scene.add(transformControls)

// Handle changes
transformControls.addEventListener('change', () => {
  renderer.render(scene, camera)
})

// Optional: Disable orbit controls while dragging
transformControls.addEventListener('dragging-changed', (event) => {
  if (orbitControls) {
    orbitControls.enabled = !event.value
  }
})

// Switch modes
transformControls.setMode('translate') // or 'rotate', 'scale'

// Set space
transformControls.setSpace('world') // or 'local'

// Enable snapping
transformControls.setTranslationSnap(1)
transformControls.setRotationSnap(THREE.MathUtils.degToRad(15))
transformControls.setScaleSnap(0.25)
```

## API

### Constructor

```typescript
new TransformControls(camera: Camera, domElement: HTMLElement)
```

### Properties

- `mode`: Current transformation mode ('translate', 'rotate', 'scale')
- `space`: Current transformation space ('world', 'local')
- `size`: Size of the gizmo (default: 1)
- `showX`, `showY`, `showZ`: Show/hide specific axes
- `enabled`: Enable/disable the controls
- `axis`: Currently selected axis ('X', 'Y', 'Z', 'XY', 'YZ', 'XZ', 'XYZ', etc.)

### Methods

- `attach(object: Object3D)`: Attach controls to an object
- `detach()`: Detach controls from the current object
- `setMode(mode: 'translate' | 'rotate' | 'scale')`: Set transformation mode
- `setSpace(space: 'world' | 'local')`: Set transformation space
- `setSize(size: number)`: Set gizmo size
- `setTranslationSnap(snap: number | null)`: Enable/disable translation snapping
- `setRotationSnap(snap: number | null)`: Enable/disable rotation snapping
- `setScaleSnap(snap: number | null)`: Enable/disable scale snapping
- `dispose()`: Clean up resources

### Events

- `change`: Fired when any change occurs
- `mouseDown`: Fired when pointer becomes active
- `mouseUp`: Fired when pointer is released
- `objectChange`: Fired when the attached object is transformed
- `dragging-changed`: Fired when dragging starts/stops (event.value is boolean)

## Example

Check out the examples directory for complete working examples.

## License

MIT
