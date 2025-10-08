import * as THREE from 'three'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'
import { MeasurementTool, SnapMode } from '@tonybfox/threejs-measurements'

// Scene setup using shared utilities
const sceneSetup = new SceneSetup({
  backgroundColor: 0x1a1a1a,
  cameraPosition: [5, 5, 5],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

// Access scene, camera, renderer, and controls from sceneSetup
const { scene, camera, renderer, controls } = sceneSetup

// Set up CSS2DRenderer for measurement labels
const css2dRenderer = new CSS2DRenderer()
css2dRenderer.setSize(window.innerWidth, window.innerHeight)
css2dRenderer.domElement.style.position = 'absolute'
css2dRenderer.domElement.style.top = '0'
css2dRenderer.domElement.style.left = '0'
css2dRenderer.domElement.style.pointerEvents = 'none' // Container is non-interactive, but labels have pointerEvents: 'auto'
document.body.appendChild(css2dRenderer.domElement)

// Handle window resize for CSS2DRenderer
window.addEventListener('resize', () => {
  css2dRenderer.setSize(window.innerWidth, window.innerHeight)
})

// Create sample geometry to measure using ObjectFactory
const group = new THREE.Group()

// Add a ground plane using SceneSetup utility
sceneSetup.addGround(10, 0x444444)

// Add some cubes at different positions using ObjectFactory
const cube1 = ObjectFactory.createBox([1, 1, 1], 0x66aaff, [-2, 0.5, -2])
cube1.castShadow = true
group.add(cube1)

const cube2 = ObjectFactory.createBox([1, 1, 1], 0x66aaff, [2, 0.5, 2])
cube2.castShadow = true
group.add(cube2)

const cube3 = ObjectFactory.createBox([1, 1, 1], 0x66aaff, [-2, 0.5, 2])
cube3.castShadow = true
group.add(cube3)

// Add a sphere using ObjectFactory
const sphereObj = ObjectFactory.createSphere(0.8, 0xff6666, [0, 0.8, 0])
sphereObj.castShadow = true
group.add(sphereObj)

scene.add(group)

// Initialize measurement tool
const measurementTool = new MeasurementTool(scene, camera, {
  snapEnabled: true,
  snapDistance: 0.05,
  lineColor: 0xff4444,
  labelColor: '#ffff00',
  previewColor: 0x00ffff,
})

// Create control panel using UIHelpers
const controlPanel = UIHelpers.createControlPanel(
  'Measurement Tool',
  'top-left'
)

// Create UI elements using UIHelpers
let isMeasuring = false

const toggleButton = UIHelpers.createButton('Start Measuring', () => {
  if (!isMeasuring) {
    // Get all meshes in the group for measurement targets
    const targets = []
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        targets.push(object)
      }
    })

    measurementTool.enableInteraction(renderer.domElement, targets)
    isMeasuring = true
    toggleButton.textContent = 'Stop Measuring'
  } else {
    measurementTool.disableInteraction()
    isMeasuring = false
    toggleButton.textContent = 'Start Measuring'
  }
})

const undoButton = UIHelpers.createButton(
  'Undo Last',
  () => {
    measurementTool.undoLast()
  },
  'secondary'
)

const clearButton = UIHelpers.createButton(
  'Clear All',
  () => {
    measurementTool.clearAll()
  },
  'danger'
)

const editButton = UIHelpers.createButton(
  'Edit Last',
  () => {
    const measurements = measurementTool.getMeasurements()
    if (measurements.length > 0) {
      const lastMeasurement = measurements[measurements.length - 1]
      measurementTool.enterEditMode(lastMeasurement.id)
    }
  },
  'secondary'
)

const exportButton = UIHelpers.createButton(
  'Export Data',
  () => {
    const data = measurementTool.serialize()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'measurements.json'
    a.click()
    URL.revokeObjectURL(url)
  },
  'success'
)

// Create hidden file input for import
const fileInput = document.createElement('input')
fileInput.type = 'file'
fileInput.accept = '.json'
fileInput.style.display = 'none'
document.body.appendChild(fileInput)

const importButton = UIHelpers.createButton(
  'Import Data',
  () => {
    fileInput.click()
  },
  'secondary'
)

// Create snap enabled checkbox manually since UIHelpers doesn't have it
const snapContainer = document.createElement('div')
snapContainer.style.margin = '15px 0'

const snapLabel = document.createElement('label')
snapLabel.style.display = 'flex'
snapLabel.style.alignItems = 'center'
snapLabel.style.fontSize = '14px'
snapLabel.style.cursor = 'pointer'

const snapEnabledCheckbox = document.createElement('input')
snapEnabledCheckbox.type = 'checkbox'
snapEnabledCheckbox.checked = true
snapEnabledCheckbox.style.marginRight = '8px'

const snapLabelText = document.createElement('span')
snapLabelText.textContent = 'Snap to Vertices'

snapLabel.appendChild(snapEnabledCheckbox)
snapLabel.appendChild(snapLabelText)
snapContainer.appendChild(snapLabel)

// Create snap distance slider using UIHelpers
const snapDistanceSlider = UIHelpers.createSlider(
  0.01,
  0.5,
  0.05,
  (value) => {
    measurementTool.snapDistance = parseFloat(value)
  },
  'Snap Distance'
)

// Create dynamic measurement toggle checkbox
const dynamicContainer = document.createElement('div')
dynamicContainer.style.margin = '15px 0'

const dynamicLabel = document.createElement('label')
dynamicLabel.style.display = 'flex'
dynamicLabel.style.alignItems = 'center'
dynamicLabel.style.fontSize = '14px'
dynamicLabel.style.cursor = 'pointer'

const dynamicMeasurementCheckbox = document.createElement('input')
dynamicMeasurementCheckbox.type = 'checkbox'
dynamicMeasurementCheckbox.checked = false
dynamicMeasurementCheckbox.style.marginRight = '8px'

const dynamicLabelText = document.createElement('span')
dynamicLabelText.textContent = 'Create Dynamic Measurements'

dynamicLabel.appendChild(dynamicMeasurementCheckbox)
dynamicLabel.appendChild(dynamicLabelText)
dynamicContainer.appendChild(dynamicLabel)

// Track dynamic measurement mode
let isDynamicMode = false

// Add all elements to control panel
controlPanel.appendChild(toggleButton)
controlPanel.appendChild(undoButton)
controlPanel.appendChild(clearButton)
controlPanel.appendChild(editButton)
controlPanel.appendChild(exportButton)
controlPanel.appendChild(importButton)
controlPanel.appendChild(snapContainer)
controlPanel.appendChild(snapDistanceSlider)
controlPanel.appendChild(dynamicContainer)

// Create info panel for measurement stats
const infoPanel = UIHelpers.createControlPanel(
  'Measurement Info',
  'bottom-left'
)

const measurementCountDiv = document.createElement('div')
measurementCountDiv.innerHTML =
  'Measurements: <span id="measurementCount">0</span>'

const currentModeDiv = document.createElement('div')
currentModeDiv.innerHTML = 'Mode: <span id="currentMode">Viewing</span>'

const measurementTypeDiv = document.createElement('div')
measurementTypeDiv.innerHTML = 'Type: <span id="measurementType">Static</span>'

const lastMeasurementDiv = document.createElement('div')
lastMeasurementDiv.id = 'lastMeasurement'

const helpDiv = document.createElement('div')
helpDiv.style.marginTop = '10px'
helpDiv.style.fontSize = '11px'
helpDiv.style.color = '#ccc'
helpDiv.innerHTML =
  'Click on objects to measure distances.<br />' +
  'Toggle Dynamic mode to track moving objects.<br />' +
  'ESC to cancel current measurement.<br />' +
  '<strong>Double-click on a label to edit it!</strong>'

infoPanel.appendChild(measurementCountDiv)
infoPanel.appendChild(currentModeDiv)
infoPanel.appendChild(measurementTypeDiv)
infoPanel.appendChild(lastMeasurementDiv)
infoPanel.appendChild(helpDiv)

// Get references to the spans for updating
const measurementCountSpan = document.getElementById('measurementCount')
const currentModeSpan = document.getElementById('currentMode')
const measurementTypeSpan = document.getElementById('measurementType')

// Event listeners
measurementTool.addEventListener('measurementCreated', (event) => {
  updateUI()
  lastMeasurementDiv.textContent = `Last: ${event.measurement.distance.toFixed(2)}m`
})

measurementTool.addEventListener('measurementRemoved', updateUI)
measurementTool.addEventListener('measurementsCleared', updateUI)

measurementTool.addEventListener('started', () => {
  currentModeSpan.textContent = 'Measuring'
  toggleButton.classList.add('active')
})

measurementTool.addEventListener('ended', () => {
  currentModeSpan.textContent = 'Viewing'
  toggleButton.classList.remove('active')
  isMeasuring = false
  toggleButton.textContent = 'Start Measuring'
})

measurementTool.addEventListener('previewUpdated', (event) => {
  // Optional: Show live distance during measurement
  // Could display in a tooltip or status bar
})

measurementTool.addEventListener('editModeEntered', (event) => {
  currentModeSpan.textContent = 'Editing'
  console.log('Edit mode entered for measurement:', event.measurement.id)
})

measurementTool.addEventListener('editModeExited', (event) => {
  currentModeSpan.textContent = isMeasuring ? 'Measuring' : 'Viewing'
  console.log('Edit mode exited for measurement:', event.measurement.id)
})

measurementTool.addEventListener('measurementUpdated', (event) => {
  console.log(
    'Measurement updated:',
    event.measurement.id,
    'New distance:',
    event.measurement.distance.toFixed(2)
  )
  lastMeasurementDiv.textContent = `Updated: ${event.measurement.distance.toFixed(2)}m`
})

// Additional event handlers for checkbox and file input
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      measurementTool.deserialize(data)
    } catch (error) {
      console.error('Error importing measurements:', error)
      alert('Error importing measurements. Please check the file format.')
    }
  }
  reader.readAsText(file)
})

snapEnabledCheckbox.addEventListener('change', (e) => {
  measurementTool.snapEnabled = e.target.checked
  measurementTool.snapMode = e.target.checked
    ? SnapMode.VERTEX
    : SnapMode.DISABLED
})

dynamicMeasurementCheckbox.addEventListener('change', (e) => {
  isDynamicMode = e.target.checked
  measurementTool.setDynamicMode(isDynamicMode)
  measurementTypeSpan.textContent = isDynamicMode ? 'Dynamic' : 'Static'
  measurementTypeSpan.style.color = isDynamicMode ? '#00ff00' : '#ffffff'
  console.log(`Dynamic measurement mode: ${isDynamicMode ? 'ON' : 'OFF'}`)
})

// Add some programmatic measurements as examples
measurementTool.addMeasurement(
  new THREE.Vector3(-2, 1.5, -2), // Top of cube1
  new THREE.Vector3(2, 1.5, 2) // Top of cube2
)

// Measure from moving sphere to moving cube
measurementTool.addDynamicMeasurement(
  sphereObj, // Moving sphere
  cube3, // Moving cube
  new THREE.Vector3(0, 0, 0), // Sphere center
  new THREE.Vector3(0, 0.5, 0) // Cube top center
)

function updateUI() {
  const measurements = measurementTool.getMeasurements()
  measurementCountSpan.textContent = measurements.length
}

// Custom animation function for the measurement example
function customAnimation() {
  // Optional: Add some animation to the objects
  const time = Date.now() * 0.001
  cube1.rotation.y = time * 0.5
  cube2.rotation.y = time * 0.7
  sphereObj.position.y = 0.8 + Math.sin(time) * 0.1

  // Update dynamic measurements in real-time
  measurementTool.updateDynamicMeasurements()

  // Render CSS2D labels
  css2dRenderer.render(scene, camera)
}

// Initialize UI and start animation using shared scene setup
updateUI()
sceneSetup.start(customAnimation)

console.log('Measurements Example loaded! 📏')
console.log('- Click "Start Measuring" to begin interactive measurement')
console.log('- Toggle "Create Dynamic Measurements" for moving objects')
console.log('- Click on objects to measure distances between points')
console.log('- Use Undo/Clear to manage measurements')
console.log('- Export/Import to save measurement data as JSON')
console.log('- Configure snapping and visual settings')
console.log('- Uses shared utilities for scene setup and object creation')
console.log('')
console.log('Pre-created Dynamic Measurements:')
console.log('  • Red measurements track cube-to-cube distance (tops)')
console.log('  • Yellow measurements track ground-to-sphere distance')
console.log('  • Green measurements track sphere-to-cube distance')
console.log('')
console.log('Try toggling Dynamic mode and creating your own measurements!')
