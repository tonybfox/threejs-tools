import { InfiniteGrid } from '@tonybfox/threejs-tools'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'

// Scene setup using shared utilities
const sceneSetup = new SceneSetup({
  backgroundColor: 0xffffff,
  cameraPosition: [15, 15, 15],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

// Create single grid instance
const grid = new InfiniteGrid(5, 10)
sceneSetup.scene.add(grid)

grid.addGridEventListener('divisionsChanged', (event) => {
  console.log('Divisions changed to:', event.divisions)
})

// Listen for subdivisions changes
grid.addGridEventListener('subdivisionsChanged', (event) => {
  console.log('Subdivisions changed to:', event.subdivisions)
})

// Listen for color changes
grid.addGridEventListener('colorChanged', (event) => {
  console.log(`${event.colorType} color changed to:`, event.color)
})

// Listen for fog changes
grid.addGridEventListener('fogChanged', (event) => {
  console.log(`Fog ${event.property} changed to:`, event.value)
})

// Add some 3D objects for context using ObjectFactory
const cube = ObjectFactory.createBox([2, 2, 2], 0x4fc3f7, [0, 1, 0])
sceneSetup.scene.add(cube)

const sphere = ObjectFactory.createSphere(1, 0xff6b6b, [-5, 1, 5])
sceneSetup.scene.add(sphere)

// UI Controls using shared utilities
const controlPanel = UIHelpers.createControlPanel('🔧 Grid Controls')

const divisionsSlider = UIHelpers.createSlider(
  1,
  10,
  5,
  (value) => {
    grid.setDivisions(parseFloat(value))
  },
  'Divisions'
)
divisionsSlider.querySelector('input').step = '0.1'
controlPanel.appendChild(divisionsSlider)

const subdivisionsSlider = UIHelpers.createSlider(
  0,
  20,
  10,
  (value) => {
    grid.setSubdivisions(parseInt(value))
  },
  'Subdivisions'
)
controlPanel.appendChild(subdivisionsSlider)

// Color controls
const color1Control = UIHelpers.createColorPicker(
  '#444444',
  (value) => {
    grid.setColor1(parseInt(value.replace('#', '0x')))
  },
  'Fine Grid Color'
)
controlPanel.appendChild(color1Control)

const color2Control = UIHelpers.createColorPicker(
  '#666666',
  (value) => {
    grid.setColor2(parseInt(value.replace('#', '0x')))
  },
  'Main Grid Color'
)
controlPanel.appendChild(color2Control)

const fogColorControl = UIHelpers.createColorPicker(
  '#2a2a2a',
  (value) => {
    grid.setFogColor(parseInt(value.replace('#', '0x')))
  },
  'Fog Color'
)
controlPanel.appendChild(fogColorControl)

// Fog distance controls
const fogNearSlider = UIHelpers.createSlider(
  1,
  50,
  20,
  (value) => {
    grid.setFogNear(parseFloat(value))
  },
  'Fog Near'
)
fogNearSlider.querySelector('input').step = '1'
controlPanel.appendChild(fogNearSlider)

const fogFarSlider = UIHelpers.createSlider(
  30,
  150,
  60,
  (value) => {
    grid.setFogFar(parseFloat(value))
  },
  'Fog Far'
)
fogFarSlider.querySelector('input').step = '1'
controlPanel.appendChild(fogFarSlider)

const infoText = document.createElement('div')
infoText.innerHTML =
  '<small style="color: #888">Real-time grid & fog updates</small>'
infoText.style.marginTop = '10px'
controlPanel.appendChild(infoText)

// Custom animation function
function customAnimation() {
  // Rotate objects for visual interest
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01

  sphere.position.y = 1 + Math.sin(Date.now() * 0.001) * 0.5
}

// Start animation using shared scene setup
sceneSetup.start(customAnimation)

console.log('Grid Example loaded! 🎮')
console.log('- Use mouse to orbit around the scene')
console.log(
  '- Adjust grid divisions and subdivisions with the sliders in real-time'
)
console.log('- See how the grid updates instantly as you move the controls')
