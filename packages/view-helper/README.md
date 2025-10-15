# Three.js View Helper

A customizable 3D view helper widget for Three.js applications, similar to the view gizmo in Blender and other 3D modeling tools.

## Features

- **Interactive Axis Gizmo**: Click on X, Y, Z axes to quickly orient camera
- **Customizable Position**: Place in any corner of the viewport
- **Smooth Animations**: Animated camera transitions when switching views
- **Configurable Appearance**: Customize colors, size, labels
- **TypeScript Support**: Full type definitions included

## Installation

```bash
npm install @tonybfox/threejs-view-helper
# or
pnpm add @tonybfox/threejs-view-helper
# or
yarn add @tonybfox/threejs-view-helper
```

## Usage

```typescript
import * as THREE from 'three'
import { ViewHelper } from '@tonybfox/threejs-view-helper'

// Create your scene, camera, and renderer
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
const renderer = new THREE.WebGLRenderer()

// Create view helper
const viewHelper = new ViewHelper(camera, renderer.domElement, {
  size: 128,
  position: 'bottom-right',
  offset: { x: 20, y: 20 },
  center: new THREE.Vector3(0, 0, 0),
  labels: {
    x: 'X',
    y: 'Y',
    z: 'Z',
  },
  colors: {
    x: '#ff4466',
    y: '#88ff44',
    z: '#4488ff',
    background: '#000000',
  },
})

// In your animation loop
function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  // Update view helper animation
  viewHelper.update(delta)

  // Render main scene
  renderer.render(scene, camera)

  // Render view helper overlay
  viewHelper.render(renderer)
}
```

## API

### Constructor

```typescript
new ViewHelper(camera: THREE.Camera, domElement?: HTMLElement, options?: ViewHelperOptions)
```

### Options

```typescript
interface ViewHelperOptions {
  container?: HTMLElement // Container element (default: document.body)
  size?: number // Size in pixels (default: 128)
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' // Position (default: 'bottom-right')
  offset?: { x: number; y: number } // Offset from corner (default: { x: 20, y: 20 })
  center?: THREE.Vector3 // Focus point for camera animations (default: origin)
  labels?: {
    // Axis labels
    x?: string // X-axis label (default: 'X')
    y?: string // Y-axis label (default: 'Y')
    z?: string // Z-axis label (default: 'Z')
  }
  colors?: {
    // Color configuration
    x: string // X-axis color (default: '#ff4466')
    y: string // Y-axis color (default: '#88ff44')
    z: string // Z-axis color (default: '#4488ff')
    background: string // Background color (default: '#000000')
  }
}
```

### Methods

- `render(renderer: THREE.WebGLRenderer)`: Render the view helper overlay
- `update(delta: number)`: Update animations (call in your animation loop)
- `handleClick(event: PointerEvent): boolean`: Handle click events (automatically set up)
- `setLabels(x?: string, y?: string, z?: string)`: Update axis labels
- `dispose()`: Clean up resources

### Events

The ViewHelper extends THREE.EventDispatcher and emits the following events:

- `animationStart`: Fired when camera animation begins
- `animationEnd`: Fired when camera animation completes

```typescript
viewHelper.addEventListener('animationStart', () => {
  console.log('Camera animation started')
})

viewHelper.addEventListener('animationEnd', () => {
  console.log('Camera animation completed')
})
```

## License

MIT
