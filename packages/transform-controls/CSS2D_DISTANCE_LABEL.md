# CSS2D Distance Label Feature

The Transform Controls now includes a **CSS2DObject** that displays the distance moved in real-time during translation operations.

## What's New

When you drag an object using the translate gizmo, you'll see:

- A white line connecting the start position to the current position (existing feature)
- **A distance label positioned at the midpoint of the line** showing the total distance moved (new!)

## Features

- **Real-time updates**: The distance label updates as you drag the object
- **Midpoint positioning**: The label is always positioned at the center of the movement line
- **High precision**: Displays distance to 3 decimal places
- **Clean styling**: Dark background with white text for good visibility
- **Non-intrusive**: Pointer events disabled, won't interfere with interactions

## Requirements

To use this feature, you need to set up a **CSS2DRenderer** in your scene:

```javascript
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { TransformControls } from '@tonybfox/threejs-transform-controls'

// Create CSS2DRenderer
const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(window.innerWidth, window.innerHeight)
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.top = '0px'
labelRenderer.domElement.style.pointerEvents = 'none'
document.body.appendChild(labelRenderer.domElement)

// Create transform controls as usual
const transformControls = new TransformControls(camera, renderer.domElement)
scene.add(transformControls.getHelper())

// In your animation loop, render both
function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera) // Render CSS2D labels
}

// Handle resize for both renderers
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
})
```

## Behavior

### Translation Mode

- ✅ Distance label is **visible** and shows the total distance moved
- ✅ Label is positioned at the midpoint between start and current position
- ✅ Updates in real-time as you drag

### Rotation Mode

- ❌ Distance label is **hidden** (rotation doesn't have a meaningful distance)

### Scale Mode

- ❌ Distance label is **hidden** (scale doesn't have a meaningful distance)

## Implementation Details

The distance is calculated using the Euclidean distance formula:

```javascript
const totalDistance = Math.sqrt(
  xDistance² + yDistance² + zDistance²
)
```

Where:

- `xDistance = current.x - start.x`
- `yDistance = current.y - start.y`
- `zDistance = current.z - start.z`

## Customization

You can customize the label appearance by accessing the CSS2DObject:

```javascript
const transformControls = new TransformControls(camera, renderer.domElement)

// Access the distance label (after controls are created)
const label = transformControls._distanceLabel.element

// Customize styling
label.style.background = 'rgba(255, 0, 0, 0.8)' // Red background
label.style.color = '#00ff00' // Green text
label.style.fontSize = '16px' // Larger font
label.style.padding = '8px 12px' // More padding
label.style.borderRadius = '8px' // Rounder corners
```

## Example Output

When dragging an object, the label might show:

- `1.234` - Object moved 1.234 units
- `5.678` - Object moved 5.678 units
- `0.050` - Small movement of 0.05 units

The precision is set to 3 decimal places for accuracy while remaining readable.

## See It In Action

Check out the transform-controls example to see this feature in action:

```
pnpm dev
# Navigate to http://localhost:3001/transform-controls/
```

Then click on any object and drag it using the translate gizmo (arrow handles). You'll see the distance label appear at the midpoint of the movement line!
