# @tonybfox/threejs-tools-outline

Add dynamic outlines and edge lines to Three.js objects with two rendering modes: mesh-based and post-processing.

## Features

- **Two Rendering Modes:**
  - **Mesh Mode**: Simple inverted hull + edge lines (no post-processing required)
  - **Post-Processing Mode**: ID buffer edge detection for pixel-perfect outlines (best quality)
- **Auto-Updates**: Outlines follow object transforms and animations
- **Smart Exclusions**: Built-in filters for helpers, gizmos, and Line2 objects
- **Flexible**: Works with any Three.js scene and objects

## Installation

```bash
npm install @tonybfox/threejs-tools-outline
```

## Mesh Mode (Simple)

Best for quick setup without post-processing pipeline. Uses inverted hull for silhouettes and geometry edges for lines.

```typescript
import { OutlineTool } from '@tonybfox/threejs-tools-outline'

const outlineTool = new OutlineTool(renderer, {
  outlineColor: 0xff0000,
  edgeLineWidth: 2,
})

outlineTool.addObjects([mesh1, mesh2, group])

// In animation loop
function animate() {
  outlineTool.update() // Update transforms
  renderer.render(scene, camera)
}
```

// Initialize composer
outlineTool.initComposer(scene, camera)

outlineTool.addObjects([mesh1, mesh2, group])

// In animation loop (use render instead of renderer.render)
function animate() {
outlineTool.render(scene, camera)
}

````

## Options

```typescript
interface OutlineOptions {

  /** Outline color (hex) - default: 0xff0000 */
  outlineColor?: number

  /** Line thickness in pixels - default: 2 */
  edgeLineWidth?: number

  // --- Mesh Mode Only ---

  /** Edge line color (hex) - default: 0xff0000 */
  edgeLineColor?: number

  /** Edge detection angle threshold (degrees) - default: 30 */
  edgeThreshold?: number

  /** Silhouette scale multiplier - default: 1.02 */
  outlineScale?: number

  /** Enable silhouette outline - default: true */
  enableSilhouette?: boolean

  /** Enable edge lines - default: true */
  enableEdgeLines?: boolean

  // --- Post-Process Mode Only ---

  /** Edge strength (0-1) - default: 1.0 */
  edgeStrength?: number

  // --- Both Modes ---

  /** Custom exclusion function */
  excludeFilter?: (object: THREE.Object3D) => boolean
}
````

## Comparison

| Feature            | Mesh Mode          | Post-Process Mode       |
| ------------------ | ------------------ | ----------------------- |
| Setup complexity   | Simple             | Requires composer       |
| Silhouette quality | Good (may offset)  | Pixel-perfect           |
| Smooth surfaces    | Can show artifacts | Clean                   |
| Performance        | Good               | Better for many objects |
| Edge detection     | Geometry-based     | Pixel-based             |

## Advanced Usage

### Custom Exclusion Filter

```typescript
const outlineTool = new OutlineTool(renderer, {
  excludeFilter: (obj) => {
    // Exclude by type
    if (obj.type === 'Line2') return true

    // Exclude by name
    if (obj.name.includes('arrow')) return true

    // Exclude by userData
    if (obj.userData.noOutline) return true

    return false
  },
})
```

### Switching Modes

For mesh mode, objects can be outlined/de-outlined at runtime:

```typescript
// Add/remove specific objects
outlineTool.addObject(mesh)
outlineTool.removeObject(mesh)

// Clear all
outlineTool.clearAll()
```

For post-process mode, same API but call `render()` instead of `update()`.

### Updating Options

```typescript
outlineTool.setOptions({
  outlineColor: 0x00ff00,
  edgeLineWidth: 3,
  edgeStrength: 0.8,
})
```

## Default Exclusions

The tool automatically excludes:

- `Line2` and `LineSegments2` objects
- Three.js helpers (GridHelper, AxesHelper, etc.)
- Objects with `userData.excludeOutline = true`
- Objects with names containing: "arrow", "gizmo", "control"

## Examples

### Mesh Mode with Custom Settings

```typescript
const outlineTool = new OutlineTool(renderer, {
  outlineColor: 0xff0000,
  edgeLineColor: 0xff0000,
  edgeLineWidth: 2,
  edgeThreshold: 45, // Higher = fewer edges
  outlineScale: 1.03,
  enableSilhouette: true,
  enableEdgeLines: false, // Only silhouette, no edges
})

outlineTool.addObject(torus)

function animate() {
  torus.rotation.y += 0.01
  outlineTool.update()
  renderer.render(scene, camera)
}
```

## License

MIT
