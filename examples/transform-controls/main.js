import * as THREE from 'three'
import { TransformControls } from '@tonybfox/threejs-tools'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'

// Scene setup using shared utilities
const sceneSetup = new SceneSetup({
  backgroundColor: 0x1a1a1a,
  cameraPosition: [8, 8, 8],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

const { scene, camera, renderer, controls } = sceneSetup

// Create CSS2DRenderer for labels
const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(window.innerWidth, window.innerHeight)
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.top = '0px'
labelRenderer.domElement.style.pointerEvents = 'none'
document.body.appendChild(labelRenderer.domElement)

// Add ground plane
sceneSetup.addGround(20, 0x333333)

// Create some objects to transform
const objects = []

const cube = ObjectFactory.createBox([1.5, 1.5, 1.5], 0xff6b6b, [-3, 0.75, 0])
cube.castShadow = true
cube.name = 'Cube'
objects.push(cube)
scene.add(cube)

const sphere = ObjectFactory.createSphere(0.8, 0x4fc3f7, [0, 0.8, 0])
sphere.castShadow = true
sphere.name = 'Sphere'
objects.push(sphere)
scene.add(sphere)

const cylinder = new THREE.Mesh(
  new THREE.CylinderGeometry(0.6, 0.6, 2, 32),
  new THREE.MeshStandardMaterial({ color: 0x82cc19 })
)
cylinder.position.set(3, 1, 0)
cylinder.castShadow = true
cylinder.name = 'Cylinder'
objects.push(cylinder)
scene.add(cylinder)

const torus = new THREE.Mesh(
  new THREE.TorusGeometry(0.8, 0.3, 16, 100),
  new THREE.MeshStandardMaterial({ color: 0xffd700 })
)
torus.position.set(0, 1, 3)
torus.castShadow = true
torus.name = 'Torus'
objects.push(torus)
scene.add(torus)

// Create transform controls
const transformControls = new TransformControls(camera, renderer.domElement)
transformControls.setRotationSnap(THREE.MathUtils.degToRad(15)) // Snap rotation to 15 degrees
scene.add(transformControls.getHelper())

// Initially attach to the first object
transformControls.attach(cube)
let selectedObject = cube

// When dragging, disable orbit controls
transformControls.addEventListener('dragging-changed', (event) => {
  controls.enabled = !event.value
})

// Log changes
transformControls.addEventListener('objectChange', () => {
  console.log('Object transformed:', selectedObject.name)
})

transformControls.addEventListener('mouseDown', () => {
  console.log('Transform started')
})

transformControls.addEventListener('mouseUp', () => {
  console.log('Transform ended')
})

// Keyboard shortcuts
window.addEventListener('keydown', (event) => {
  switch (event.key.toLowerCase()) {
    case ' ':
      event.preventDefault()
      transformControls.enabled = !transformControls.enabled
      console.log('Controls enabled:', transformControls.enabled)
      break
    case 'w':
      transformControls.setSpace('world')
      updateSpaceButtons('world')
      break
    case 'l':
      transformControls.setSpace('local')
      updateSpaceButtons('local')
      break
    case '+':
    case '=':
      transformControls.setSize(transformControls.size + 0.1)
      updateSizeSlider()
      break
    case '-':
    case '_':
      transformControls.setSize(Math.max(0.1, transformControls.size - 0.1))
      updateSizeSlider()
      break
    case 'x':
      transformControls.showX = !transformControls.showX
      updateVisibilityCheckboxes()
      break
    case 'y':
      transformControls.showY = !transformControls.showY
      updateVisibilityCheckboxes()
      break
    case 'z':
      transformControls.showZ = !transformControls.showZ
      updateVisibilityCheckboxes()
      break
  }
})

// UI Controls
const controlPanel = UIHelpers.createControlPanel(
  '🎮 Transform Controls',
  'top-left'
)

// Object selection buttons
const objectSection = UIHelpers.createSection('Select Object')
objectSection.style.marginTop = '0'
const objectButtonContainer = document.createElement('div')
Object.assign(objectButtonContainer.style, {
  display: 'flex',
  gap: '8px',
  marginTop: '10px',
})

objects.forEach((obj) => {
  const button = UIHelpers.createButton(obj.name, () => {
    if (selectedObject === obj) {
      transformControls.detach()
      selectedObject = null
      updateObjectSelection(null)
    } else {
      selectedObject = obj
      transformControls.attach(obj)
      updateObjectSelection(obj)
    }
  })
  button.dataset.object = obj.name
  button.style.flex = '1'
  button.style.fontSize = '12px'
  button.style.padding = '10px 5px'
  if (obj === selectedObject) {
    button.style.background = '#4fc3f7'
    button.style.border = '2px solid #4fc3f7'
  }
  objectButtonContainer.appendChild(button)
})

objectSection.appendChild(objectButtonContainer)
controlPanel.appendChild(objectSection)

function updateObjectSelection(object) {
  objectButtonContainer.querySelectorAll('button').forEach((btn) => {
    if (object && btn.dataset.object === object.name) {
      btn.style.background = '#4fc3f7'
      btn.style.border = '2px solid #4fc3f7'
    } else {
      btn.style.background = '#3b82f6'
      btn.style.border = 'none'
    }
  })
}

// Space buttons
const spaceSection = UIHelpers.createSection('Space')
const spaceButtonContainer = document.createElement('div')
Object.assign(spaceButtonContainer.style, {
  display: 'flex',
  gap: '8px',
  marginTop: '10px',
})

const spaces = ['world', 'local']
spaces.forEach((space) => {
  const button = UIHelpers.createButton(
    space.charAt(0).toUpperCase() + space.slice(1),
    () => {
      transformControls.setSpace(space)
      updateSpaceButtons(space)
    }
  )
  button.dataset.space = space
  button.style.flex = '1'
  if (space === 'world') {
    button.style.background = '#4fc3f7'
  }
  spaceButtonContainer.appendChild(button)
})

spaceSection.appendChild(spaceButtonContainer)
controlPanel.appendChild(spaceSection)

function updateSpaceButtons(activeSpace) {
  spaceButtonContainer.querySelectorAll('button').forEach((btn) => {
    if (btn.dataset.space === activeSpace) {
      btn.style.background = '#4fc3f7'
    } else {
      btn.style.background = '#3b82f6'
    }
  })
}

// Gizmo size slider
const sizeSlider = UIHelpers.createSlider(
  0.1,
  3,
  0.75,
  (value) => {
    transformControls.setSize(parseFloat(value))
  },
  'Gizmo Size'
)
sizeSlider.querySelector('input').step = '0.1'
sizeSlider.querySelector('input').id = 'sizeSliderInput'
controlPanel.appendChild(sizeSlider)

function updateSizeSlider() {
  const input = sizeSlider.querySelector('input')
  if (input) {
    input.value = transformControls.size
    const valueDisplay = input.nextElementSibling
    if (valueDisplay) {
      valueDisplay.textContent = transformControls.size.toFixed(1)
    }
  }
}

// Snapping section
const snappingSection = UIHelpers.createSection('Snapping')

// Translation snap
const transSnap = UIHelpers.createSlider(
  0,
  2,
  0,
  (value) => {
    const snapValue = parseFloat(value)
    transformControls.setTranslationSnap(snapValue === 0 ? null : snapValue)
  },
  'Translation Snap'
)
transSnap.querySelector('input').step = '0.1'
transSnap.style.marginTop = '10px'
snappingSection.appendChild(transSnap)

// Rotation snap
const rotSnap = UIHelpers.createSlider(
  0,
  45,
  0,
  (value) => {
    const snapValue = parseFloat(value)
    transformControls.setRotationSnap(
      snapValue === 0 ? null : THREE.MathUtils.degToRad(snapValue)
    )
  },
  'Rotation Snap (deg)'
)
rotSnap.querySelector('input').step = '5'
snappingSection.appendChild(rotSnap)

// Scale snap
const scaleSnap = UIHelpers.createSlider(
  0,
  1,
  0,
  (value) => {
    const snapValue = parseFloat(value)
    transformControls.setScaleSnap(snapValue === 0 ? null : snapValue)
  },
  'Scale Snap'
)
scaleSnap.querySelector('input').step = '0.1'
snappingSection.appendChild(scaleSnap)

controlPanel.appendChild(snappingSection)

// Visibility section
const visibilitySection = UIHelpers.createSection('Visibility')

const axisCheckboxes = []
const axes = ['X', 'Y', 'Z']
axes.forEach((axis) => {
  const checkbox = UIHelpers.createCheckbox(
    `Show ${axis} Axis`,
    true,
    (checked) => {
      transformControls[`show${axis}`] = checked
    }
  )
  checkbox.style.marginTop = '10px'
  checkbox.style.marginBottom = '5px'
  axisCheckboxes.push(checkbox.querySelector('input'))
  visibilitySection.appendChild(checkbox)
})

controlPanel.appendChild(visibilitySection)

function updateVisibilityCheckboxes() {
  axisCheckboxes[0].checked = transformControls.showX
  axisCheckboxes[1].checked = transformControls.showY
  axisCheckboxes[2].checked = transformControls.showZ
}

// Keyboard shortcuts info
const shortcutsInfo = UIHelpers.createTextDisplay(
  `<strong>Keyboard Shortcuts:</strong><br>
  <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; font-family: monospace;">Space</span> Toggle controls<br>
  <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; font-family: monospace;">W</span> World space<br>
  <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; font-family: monospace;">L</span> Local space<br>
  <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; font-family: monospace;">+/-</span> Increase/Decrease size<br>
  <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; font-family: monospace;">X/Y/Z</span> Hide/Show axes`,
  {
    fontSize: '11px',
    color: '#999',
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  }
)
controlPanel.appendChild(shortcutsInfo)

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  if (controls) controls.updateDelta()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}

// Start animation
animate()

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
})

console.log('Transform Controls Example loaded!')
console.log('Click on objects to select them, then use the gizmo to transform.')
console.log(
  'Keyboard shortcuts: G (translate), R (rotate), S (scale), Space (toggle), W (world), L (local)'
)
