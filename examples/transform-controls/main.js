import * as THREE from 'three'
import { TransformControls } from '@tonybfox/threejs-transform-controls'
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

const { scene, camera, renderer, controls: orbitControls } = sceneSetup

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
scene.add(transformControls.getHelper())

// Initially attach to the first object
transformControls.attach(cube)
let selectedObject = cube

// When dragging, disable orbit controls
transformControls.addEventListener('dragging-changed', (event) => {
  orbitControls.enabled = !event.value
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
    case 'a':
      transformControls.setMode('all')
      updateModeButtons('all')
      break
    case 'g':
      transformControls.setMode('translate')
      updateModeButtons('translate')
      break
    case 'r':
      transformControls.setMode('rotate')
      updateModeButtons('rotate')
      break
    case 's':
      transformControls.setMode('scale')
      updateModeButtons('scale')
      break
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
function createObjectButtons() {
  const container = document.getElementById('objectSelector')
  objects.forEach((obj) => {
    const button = document.createElement('div')
    button.className = 'object-button'
    if (obj === selectedObject) button.classList.add('selected')
    button.textContent = obj.name
    button.onclick = () => {
      selectedObject = obj
      transformControls.attach(obj)
      updateObjectSelection(obj)
    }
    button.dataset.object = obj.name
    container.appendChild(button)
  })
}

function updateObjectSelection(object) {
  document.querySelectorAll('.object-button').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.object === object.name)
  })
}

function createModeButtons() {
  const container = document.getElementById('modeButtons')
  const modes = ['all', 'translate', 'rotate', 'scale']

  modes.forEach((mode) => {
    const button = UIHelpers.createButton(
      mode.charAt(0).toUpperCase() + mode.slice(1),
      () => {
        transformControls.setMode(mode)
        updateModeButtons(mode)
      }
    )
    button.dataset.mode = mode
    if (mode === 'all') button.classList.add('active')
    container.appendChild(button)
  })
}

function updateModeButtons(activeMode) {
  document.querySelectorAll('#modeButtons .button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === activeMode)
  })
}

function createSpaceButtons() {
  const container = document.getElementById('spaceButtons')
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
    if (space === 'world') button.classList.add('active')
    container.appendChild(button)
  })
}

function updateSpaceButtons(activeSpace) {
  document.querySelectorAll('#spaceButtons .button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.space === activeSpace)
  })
}

function createSizeSlider() {
  const container = document.getElementById('sizeSlider')
  const slider = UIHelpers.createSlider(
    0.1,
    3,
    0.75,
    (value) => {
      transformControls.setSize(parseFloat(value))
    },
    'Size'
  )
  slider.querySelector('input').step = '0.1'
  slider.querySelector('input').id = 'sizeSliderInput'
  container.appendChild(slider)
}

function updateSizeSlider() {
  const input = document.getElementById('sizeSliderInput')
  if (input) {
    input.value = transformControls.size
    const valueDisplay = input.parentElement.querySelector(
      '.slider-label span:last-child'
    )
    if (valueDisplay) {
      valueDisplay.textContent = transformControls.size.toFixed(1)
    }
  }
}

function createSnappingControls() {
  const container = document.getElementById('snappingControls')

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
  container.appendChild(transSnap)

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
  container.appendChild(rotSnap)

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
  container.appendChild(scaleSnap)
}

function createVisibilityControls() {
  const container = document.getElementById('visibilityControls')

  const axes = ['X', 'Y', 'Z']
  axes.forEach((axis) => {
    const checkbox = document.createElement('div')
    checkbox.className = 'checkbox-container'
    checkbox.innerHTML = `
      <input type="checkbox" id="show${axis}" checked>
      <label for="show${axis}">Show ${axis} Axis</label>
    `
    container.appendChild(checkbox)

    checkbox.querySelector('input').addEventListener('change', (e) => {
      transformControls[`show${axis}`] = e.target.checked
    })
  })
}

function updateVisibilityCheckboxes() {
  document.getElementById('showX').checked = transformControls.showX
  document.getElementById('showY').checked = transformControls.showY
  document.getElementById('showZ').checked = transformControls.showZ
}

// Initialize UI
createObjectButtons()
createModeButtons()
createSpaceButtons()
createSizeSlider()
createSnappingControls()
createVisibilityControls()

// Animation loop
function animate() {
  requestAnimationFrame(animate)
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
