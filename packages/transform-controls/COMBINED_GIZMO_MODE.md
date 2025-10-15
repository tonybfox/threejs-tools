# Combined Gizmo Mode - All Transforms Visible

The Transform Controls now supports an **'all'** mode that displays translate, rotate, and scale gizmos simultaneously, similar to the React Three Fiber transform controls.

## What's New

### All Mode (`mode: 'all'`)

When set to 'all' mode, you'll see:

- ✅ **Translation arrows** (Red X, Green Y, Blue Z) - stays the same
- ✅ **Rotation arcs** (semi-circles around each axis) - for rotation control
- ✅ **Scale cubes** (small cubes at the ends of axes) - for scaling control

All three gizmos are visible and interactive at the same time!

## Visual Layout

```
        ↑ Y (Green Arrow - Translate)
        |
        |  ╭─╮ (Green Cube - Scale)
        | /   \
       ╭╯      ╰╮ (Green Arc - Rotate)
      /    ●     \  (Object center)
     /           /
    ╰───────────╯
   X (Red)     Z (Blue)
```

The gizmo intelligently prioritizes interactions:

1. **Scale cubes** (highest priority - smallest targets)
2. **Rotation arcs** (medium priority)
3. **Translation arrows** (lowest priority - easiest to hit)

## Usage

### Setting the Mode

```javascript
import { TransformControls } from '@tonybfox/threejs-transform-controls'

const controls = new TransformControls(camera, renderer.domElement)

// Enable all modes simultaneously (default)
controls.setMode('all')

// Or use individual modes
controls.setMode('translate')
controls.setMode('rotate')
controls.setMode('scale')
```

### Default Behavior

By default, the transform controls now start in **'all' mode**, showing all gizmos at once. This provides the most intuitive and feature-rich experience similar to professional 3D software.

## How It Works

### Intelligent Mode Detection

When in 'all' mode, the controls automatically detect which gizmo you're interacting with:

1. **User clicks on a scale cube** → Performs scaling
2. **User clicks on a rotation arc** → Performs rotation
3. **User clicks on a translation arrow** → Performs translation

The active transformation mode is determined dynamically based on which gizmo element you click on.

### Internal Implementation

```javascript
// When you click on a gizmo in 'all' mode:
pointerDown() {
  if (this.mode === 'all') {
    // Checks which picker was intersected
    if (clickedOnScaleCube) {
      this._activeMode = 'scale'
    } else if (clickedOnRotationArc) {
      this._activeMode = 'rotate'
    } else {
      this._activeMode = 'translate'
    }
  }
}

// During dragging:
pointerMove() {
  const mode = this.mode === 'all' ? this._activeMode : this.mode
  // Use the active mode for transformation calculations
}
```

## Keyboard Shortcuts

The example includes these keyboard shortcuts:

- **A** - All modes (combined gizmo) ⭐ NEW!
- **G** - Translate only
- **R** - Rotate only
- **S** - Scale only
- **W** - World space
- **L** - Local space
- **Space** - Toggle controls on/off
- **+/-** - Increase/decrease gizmo size
- **X/Y/Z** - Hide/show individual axes

## Benefits

### 1. **Faster Workflow**

No need to switch modes - all transformations are available instantly.

### 2. **Better Visual Feedback**

See all available transformation options at once, making it clearer what you can do.

### 3. **Familiar Interface**

Matches the behavior of popular 3D tools like Blender, Unity, and React Three Fiber.

### 4. **Smooth Transitions**

Each gizmo type is independently interactive with proper hover states and visual feedback.

## Example Code

```javascript
import * as THREE from 'three'
import { TransformControls } from '@tonybfox/threejs-transform-controls'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

// Setup scene
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight
)
const renderer = new THREE.WebGLRenderer()

// Setup CSS2DRenderer for distance labels
const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(window.innerWidth, window.innerHeight)
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.top = '0px'
labelRenderer.domElement.style.pointerEvents = 'none'
document.body.appendChild(labelRenderer.domElement)

// Create object
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff6b6b })
)
scene.add(cube)

// Create transform controls with 'all' mode (default)
const controls = new TransformControls(camera, renderer.domElement)
controls.attach(cube)
scene.add(controls.getHelper())

// Listen for mode changes
controls.addEventListener('mouseDown', (event) => {
  console.log('Started:', event.mode) // Will show 'translate', 'rotate', or 'scale'
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}
animate()
```

## Mode Comparison

| Mode          | Translation | Rotation | Scale | Use Case                          |
| ------------- | ----------- | -------- | ----- | --------------------------------- |
| `'all'`       | ✅          | ✅       | ✅    | General purpose, fastest workflow |
| `'translate'` | ✅          | ❌       | ❌    | Precise positioning only          |
| `'rotate'`    | ❌          | ✅       | ❌    | Precise rotation only             |
| `'scale'`     | ❌          | ❌       | ✅    | Precise scaling only              |

## Customization

You can still customize individual gizmo elements:

```javascript
const controls = new TransformControls(camera, renderer.domElement)

// Hide specific axes even in 'all' mode
controls.showX = false // Hide X axis for all gizmos
controls.showY = true
controls.showZ = true

// Set snapping for each transformation type
controls.setTranslationSnap(0.5) // Snap translation to 0.5 units
controls.setRotationSnap(THREE.MathUtils.degToRad(15)) // Snap rotation to 15°
controls.setScaleSnap(0.1) // Snap scale to 0.1 increments

// Adjust gizmo size
controls.setSize(1.5) // Make gizmo 50% larger
```

## Try It Out!

Run the example to see the combined gizmo in action:

```bash
cd examples
pnpm dev
# Navigate to http://localhost:3001/transform-controls/
```

1. The gizmo starts in **'all' mode** by default
2. Click on different parts of the gizmo:
   - **Arrows** → Move the object
   - **Arcs** → Rotate the object
   - **Cubes at the tips** → Scale the object
3. Press **A, G, R, or S** to switch between modes
4. Watch the distance label update as you translate!

## Tips

- **Scale cubes** are small and have highest priority for picking
- **Rotation arcs** are semi-circles around each axis
- **Translation arrows** are the easiest to grab
- The gizmo automatically handles which mode to use based on what you click
- All three transformations share the same distance label for translation
- Rotation and scale modes hide the distance label (only translation shows it)

## Migration from Previous Version

If you were using the old default behavior:

```javascript
// Old way (still works)
const controls = new TransformControls(camera, renderer.domElement)
// Default was 'translate'

// New way (recommended)
const controls = new TransformControls(camera, renderer.domElement)
// Default is now 'all' - shows all gizmos

// To get old behavior, explicitly set translate mode
controls.setMode('translate')
```

## Future Enhancements

Potential improvements:

- [ ] Color-coded hover states per transformation type
- [ ] Visual indicator showing which mode is active during drag
- [ ] Option to disable specific transformations in 'all' mode
- [ ] Customizable gizmo element sizes per type
- [ ] Persistent mode preference

Enjoy the new combined gizmo mode! 🎮✨
