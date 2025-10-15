# Transform Controls Example

To use the transform controls package in your Three.js project:

## Installation (Monorepo)

In your examples or other packages, add it as a dependency:

```json
{
  "dependencies": {
    "@tonybfox/threejs-transform-controls": "workspace:*"
  }
}
```

## Usage

```typescript
import * as THREE from 'three'
import { TransformControls } from '@tonybfox/threejs-transform-controls'

// Setup scene, camera, renderer
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Create a mesh to transform
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// Create transform controls
const controls = new TransformControls(camera, renderer.domElement)
controls.attach(cube)
scene.add(controls.getHelper())

// Listen for changes
controls.addEventListener('dragging-changed', (event) => {
  // Disable orbit controls while dragging
  console.log('Dragging:', event.value)
})

controls.addEventListener('objectChange', () => {
  console.log('Object changed!')
})

// Switch modes with keyboard
window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'g':
      controls.setMode('translate')
      break
    case 'r':
      controls.setMode('rotate')
      break
    case 's':
      controls.setMode('scale')
      break
    case ' ':
      controls.enabled = !controls.enabled
      break
  }
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
animate()
```

## API Methods

- `attach(object)` - Attach controls to an object
- `detach()` - Detach controls from current object
- `setMode(mode)` - Set mode: 'translate', 'rotate', or 'scale'
- `setSpace(space)` - Set space: 'world' or 'local'
- `setSize(size)` - Set gizmo size
- `setTranslationSnap(value)` - Enable translation snapping
- `setRotationSnap(value)` - Enable rotation snapping (in radians)
- `setScaleSnap(value)` - Enable scale snapping

## Events

- `change` - Fired on any change
- `mouseDown` - Fired when dragging starts
- `mouseUp` - Fired when dragging ends
- `objectChange` - Fired when object transforms
- `dragging-changed` - Fired when drag state changes (use to disable orbit controls)
