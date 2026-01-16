import * as THREE from 'three'
import { AssetLoader } from '@tonybfox/threejs-tools'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'

// Scene setup using shared utilities
const sceneSetup = new SceneSetup({
  backgroundColor: 0x0f172a,
  cameraPosition: [10, 10, 10],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

const { scene, camera, renderer, controls } = sceneSetup

// Add ground plane
sceneSetup.addGround(20, 0x1e293b)

// Add some reference objects
const refCube = ObjectFactory.createBox([1, 1, 1], 0x3b82f6, [-5, 0.5, 0])
scene.add(refCube)

const refSphere = ObjectFactory.createSphere(0.5, 0xef4444, [5, 0.5, 0])
scene.add(refSphere)

// Create asset loaders for demonstration
const assetLoader = new AssetLoader()
let currentPlaceholder = null
let previewAsset = null
const loadedAssets = new Set()
let latestAsset = null
const pendingAssetUpdates = []

const getPendingPlacement = () => pendingAssetUpdates[0] || null

// Progress tracking
let progressInfo = {
  loaded: 0,
  total: 0,
  percentage: 0,
}

// Listen to asset loader events
assetLoader.addEventListener('placeholderCreated', (event) => {
  console.log('Placeholder created')
  if (currentPlaceholder) {
    scene.remove(currentPlaceholder)
  }
  currentPlaceholder = event.placeholder
  const pending = getPendingPlacement()
  if (pending) {
    placeAtBottomCenter(currentPlaceholder, pending.position)
  }
  scene.add(currentPlaceholder)
})

assetLoader.addEventListener('progress', (event) => {
  progressInfo = event
  updateProgressUI()
})

assetLoader.addEventListener('lowResLoaded', (event) => {
  console.log('Low-res model loaded')
  if (previewAsset) {
    scene.remove(previewAsset)
  }
  previewAsset = event.lowRes
  const pending = getPendingPlacement()
  if (pending) {
    placeAtBottomCenter(previewAsset, pending.position)
  }
  scene.add(previewAsset)
  latestAsset = previewAsset
})

assetLoader.addEventListener('loaded', (event) => {
  console.log('Asset loaded successfully')
  if (previewAsset && previewAsset !== event.asset) {
    scene.remove(previewAsset)
    previewAsset = null
  }
  const asset = event.asset
  loadedAssets.add(asset)
  const pending = pendingAssetUpdates.shift()
  if (pending) {
    placeAtBottomCenter(asset, pending.position)
  }
  scene.add(asset)
  latestAsset = asset

  // Remove placeholder after loading
  if (currentPlaceholder) {
    scene.remove(currentPlaceholder)
    currentPlaceholder = null
  }

  if (pending && pending.onLoad) {
    pending.onLoad(asset)
  } else {
    updateStatusUI('Asset loaded successfully!')
  }
  updateCacheInfo()
})

assetLoader.addEventListener('error', (event) => {
  console.error('Error loading asset:', event.error)
  updateStatusUI(`Error: ${event.error.message}`)

  // Keep the placeholder visible in error state - don't remove it
  // The placeholder should now be showing the error visual feedback
})

// Create UI controls
const controlPanel = UIHelpers.createControlPanel('📦 Asset Loader Controls')

// Status display
const statusDiv = document.createElement('div')
statusDiv.style.cssText = `
  margin: 15px 0;
  padding: 10px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-size: 14px;
  min-height: 20px;
`
statusDiv.textContent = 'Ready to load assets'
controlPanel.appendChild(statusDiv)

// Progress bar
const progressContainer = document.createElement('div')
progressContainer.style.cssText = `
  margin: 15px 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  height: 20px;
  overflow: hidden;
`
const progressBar = document.createElement('div')
progressBar.style.cssText = `
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #3b82f6, #06b6d4);
  transition: width 0.3s ease;
`
progressContainer.appendChild(progressBar)
controlPanel.appendChild(progressContainer)

const progressText = document.createElement('div')
progressText.style.cssText = `
  margin: 5px 0 15px 0;
  font-size: 12px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
`
progressText.textContent = '0%'
controlPanel.appendChild(progressText)

function updateProgressUI() {
  progressBar.style.width = `${progressInfo.percentage}%`
  progressText.textContent = `${progressInfo.percentage.toFixed(1)}% (${(progressInfo.loaded / 1024 / 1024).toFixed(2)}MB / ${(progressInfo.total / 1024 / 1024).toFixed(2)}MB)`
}

function updateStatusUI(message) {
  statusDiv.textContent = message
}

function placeAtBottomCenter(object, position) {
  const offsetData = object.userData.bottomCenterOffset
  if (offsetData) {
    const offset =
      offsetData instanceof THREE.Vector3
        ? offsetData
        : new THREE.Vector3(
            offsetData.x ?? 0,
            offsetData.y ?? 0,
            offsetData.z ?? 0
          )

    if (!(offsetData instanceof THREE.Vector3)) {
      object.userData.bottomCenterOffset = offset
    }

    object.position.set(
      position.x - offset.x,
      position.y - offset.y,
      position.z - offset.z
    )
  } else {
    object.position.copy(position)
  }

  object.updateMatrixWorld(true)
}

// Placeholder demo section
const placeholderSection = document.createElement('div')
placeholderSection.style.cssText =
  'margin: 20px 0; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);'
const placeholderTitle = document.createElement('div')
placeholderTitle.textContent = 'Placeholder Demo'
placeholderTitle.style.cssText =
  'font-weight: bold; margin-bottom: 10px; color: #3b82f6;'
placeholderSection.appendChild(placeholderTitle)

// Size controls for placeholder
const sizeLabel = document.createElement('div')
sizeLabel.textContent = 'Placeholder Size:'
sizeLabel.style.cssText = 'font-size: 12px; margin: 10px 0 5px 0;'
placeholderSection.appendChild(sizeLabel)

const sizeSlider = UIHelpers.createSlider(
  1,
  10,
  3,
  (value) => {
    currentPlaceholderSize = parseFloat(value)
  },
  'Size'
)
placeholderSection.appendChild(sizeSlider)

let currentPlaceholderSize = 3

// Create placeholder button
const createPlaceholderBtn = UIHelpers.createButton(
  'Create Placeholder',
  () => {
    if (currentPlaceholder) {
      scene.remove(currentPlaceholder)
    }

    const placeholder = assetLoader['createPlaceholder'](
      [currentPlaceholderSize, currentPlaceholderSize, currentPlaceholderSize],
      0x4fc3f7,
      1
    )
    currentPlaceholder = placeholder
    scene.add(currentPlaceholder)
    updateStatusUI('Placeholder created')
  },
  'primary'
)
placeholderSection.appendChild(createPlaceholderBtn)

// Animate placeholder fill button
let fillAnimation = null
const animateFillBtn = UIHelpers.createButton(
  'Animate Fill',
  () => {
    if (!currentPlaceholder) {
      updateStatusUI('Create a placeholder first!')
      return
    }

    if (fillAnimation) {
      cancelAnimationFrame(fillAnimation)
      fillAnimation = null
      animateFillBtn.textContent = 'Animate Fill'
      return
    }

    animateFillBtn.textContent = 'Stop Animation'
    let progress = 0

    const animate = () => {
      progress += 0.005
      if (progress > 1) progress = 0

      if (currentPlaceholder && currentPlaceholder instanceof THREE.Mesh) {
        const material = currentPlaceholder.material
        if (material.uniforms && material.uniforms.fillProgress) {
          material.uniforms.fillProgress.value = progress
        }
      }

      fillAnimation = requestAnimationFrame(animate)
    }
    animate()
  },
  'secondary'
)
placeholderSection.appendChild(animateFillBtn)

controlPanel.appendChild(placeholderSection)

// Model type selection
const modelSection = document.createElement('div')
modelSection.style.cssText =
  'margin: 20px 0; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);'
const modelTitle = document.createElement('div')
modelTitle.textContent = 'Model Type Demo'
modelTitle.style.cssText =
  'font-weight: bold; margin-bottom: 10px; color: #10b981;'
modelSection.appendChild(modelTitle)

const modelTypeInfo = document.createElement('div')
modelTypeInfo.style.cssText =
  'font-size: 12px; margin: 10px 0; color: rgba(255,255,255,0.6);'
modelTypeInfo.innerHTML = `
  <strong>Supported formats:</strong><br>
  • GLTF (.gltf, .glb)<br>
  • FBX (.fbx)<br>
  • OBJ (.obj)<br>
  • USD (.usd, .usdz)
`
modelSection.appendChild(modelTypeInfo)

// Example models array
const exampleModels = [
  {
    name: 'Duck (GLTF)',
    type: 'gltf',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/refs/heads/main/2.0/Duck/glTF/Duck.gltf',
    size: [1, 1, 1],
  },
  {
    name: 'visualconfig (fbx - Large)',
    type: 'fbx',
    url: 'https://visualconfig-dev.s3.eu-west-2.amazonaws.com/three-d-files/97e39447-484a-49d9-9505-b2e6aca57832/d98ff541-9d57-4587-81d1-21c336a8ab04.fbx?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEHkaCWV1LXdlc3QtMiJIMEYCIQC1sYHjGZsKN8XVvVWyHiaIc%2F9Wc9zUvmvXSHw8UksIFwIhALFFkMROSWl9IefzeFW%2BU%2FdLDzJ4%2Fp6Jd42V7MAj6MksKswDCEIQAhoMMzE1MzIxMTg2NTcwIgzqWoqPjiUou%2Bz9waEqqQPFHDHZgQoMeI6%2F%2BvcVUbUKwjlezFGtZwiQN70p9kYy%2BqRHATuxyObkaAq9MfWDpYwSBnVQplAQE3hEqlwFLPwysoLlpkFl8P3%2FGK%2F%2BEpCYA8u6nyYnerIStQ466U0W0wFN7A%2FjpqFMubLvIXDy3CsEe5eRG9DMwXJPkjvV1gCdZ%2Fz7TQ7gsEnpJM8TUKIrZ7fMUbcXSe9mu8cyCfxnjyzp7YRhb8b2DXEMHuf%2FiP%2BWqLm5MVja027c6li3rSUXcv3QaWGQu%2FdeJG84Ei6rvmtPM5WOl6vPzlu9uyCXSmVRbav0614YYnxxhE%2FOvMW6qb8Qx%2Fhn%2B6OhAgTytJuaspt4ZqvVNKYiIq9gD1g76Dhgexc3PBcwF5AbXrUBYKKo9KgGNKSn3arCuE6DLFqR2PY6KFQdacYCgCBVjKkwEkgZ00Hozq6ITjGH6qxgpHCVqU5AqmbrYHgpCK6IqXeDS46twAhiTgv%2FzudMxheyu0PK0eUgJcP202WfD7c4EBVJImoSpDI%2Fpi3s%2FtVQznQIdpRSie87Oap8f0Lu5a7LPzXtaTzrJPJsKZuLnTC9nqbLBjrdAtweqDxu0eUdKQYdZ8C3UeEK%2BWchC81xnGpGVh1Zx7rlAjuZM5J%2BeyaIocjXaEOTUokO8RYn%2BdL85NXCJuL3q7kiB6pu4arbr%2Ff1lZEGRudt6QxCUJMGa4lQbvvSDg%2BIJ1h9%2BMSs6%2B4pwQRopD4yH4IdDzM3MjEcJS4WWnN77Eyeo0yEs%2FrbXbWUL2GWOkeQ%2FH083jvKgqHtmntCBIQ3lnDlFfB8e4jRK%2FxMVje9sKZIWLyAougfFmi6VrSUj0TM5XK167scgWki9%2B%2Bj7FWsFteBmkaFRWaK%2FJ8WfiSNTaIzVfLObOKzzUi0QsDGtyp2U2kmIbeQOxztBV05RnVAQ7FGMr4HdwTYi%2BTJQxBEO4jpHBxyX4jqG7gI9%2FZs%2B9jd%2FCip6ayxAWd5IqCqN5dvzejk7PnhOktdZSC5VUS14YD5v6u7TjHKjK%2BHaRuhSlTJfZHqRFFQzeyw8vGtrdI%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAUS2U3PEFNPOAONL3%2F20260116%2Feu-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260116T010756Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=7817785733c54e8f5b0e86fa2f309513f287e71eba9f1dd79f4097d21d412f4d',
    size: [30, 12, 20],
  },
  {
    name: 'Error Test (Invalid URL)',
    type: 'gltf',
    url: 'https://invalid-url-that-does-not-exist.com/nonexistent.gltf',
    size: [3, 3, 3],
  },
]

// Create dropdown select
const selectLabel = document.createElement('div')
selectLabel.textContent = 'Select Model:'
selectLabel.style.cssText = 'font-size: 12px; margin: 10px 0 5px 0;'
modelSection.appendChild(selectLabel)

const modelSelect = document.createElement('select')
modelSelect.style.cssText = `
  width: 100%;
  padding: 8px 12px;
  margin: 5px 0 15px 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  outline: none;
`
exampleModels.forEach((model, index) => {
  const option = document.createElement('option')
  option.value = index
  option.textContent = `${model.name} [${model.type.toUpperCase()}]`
  option.style.cssText = 'background: #1e293b; color: white;'
  modelSelect.appendChild(option)
})
modelSection.appendChild(modelSelect)

// Load selected model button
const loadSelectedBtn = UIHelpers.createButton(
  'Load at Random Position',
  async () => {
    const selectedIndex = parseInt(modelSelect.value)
    const selectedModel = exampleModels[selectedIndex]

    const randomX = (Math.random() - 0.5) * 20
    const randomZ = (Math.random() - 0.5) * 20
    updateStatusUI(`Loading ${selectedModel.name}...`)

    const placementHandler = (asset) => {
      latestAsset = asset
      updateStatusUI(
        `${selectedModel.name} loaded at X: ${randomX.toFixed(1)}, Z: ${randomZ.toFixed(1)}`
      )
    }
    const pendingPlacement = {
      position: new THREE.Vector3(randomX, 0, randomZ),
      onLoad: placementHandler,
    }
    pendingAssetUpdates.push(pendingPlacement)

    try {
      await assetLoader.load({
        type: selectedModel.type,
        url: selectedModel.url,
        size: selectedModel.size,
        enableCaching: true,
        errorColor: 0xff4444,
        errorOpacity: 0.6,
      })
    } catch (error) {
      const index = pendingAssetUpdates.indexOf(pendingPlacement)
      if (index >= 0) {
        pendingAssetUpdates.splice(index, 1)
      }
      console.error('Error loading asset:', error)
      updateStatusUI(`Error: ${error.message}`)
    }
  },
  'primary'
)
modelSection.appendChild(loadSelectedBtn)

// Load at center button
const loadCenterBtn = UIHelpers.createButton(
  'Load at Center',
  async () => {
    const selectedIndex = parseInt(modelSelect.value)
    const selectedModel = exampleModels[selectedIndex]

    updateStatusUI(`Loading ${selectedModel.name}...`)

    const placementHandler = (asset) => {
      latestAsset = asset
      updateStatusUI(`${selectedModel.name} loaded at center`)
    }
    const pendingPlacement = {
      position: new THREE.Vector3(0, 0, 0),
      onLoad: placementHandler,
    }
    pendingAssetUpdates.push(pendingPlacement)

    try {
      await assetLoader.load({
        type: selectedModel.type,
        url: selectedModel.url,
        size: selectedModel.size,
        enableCaching: true,
        errorColor: 0xff4444,
        errorOpacity: 0.6,
      })
    } catch (error) {
      const index = pendingAssetUpdates.indexOf(pendingPlacement)
      if (index >= 0) {
        pendingAssetUpdates.splice(index, 1)
      }
      console.error('Error loading asset:', error)
      updateStatusUI(`Error: ${error.message}`)
    }
  },
  'secondary'
)
modelSection.appendChild(loadCenterBtn)

controlPanel.appendChild(modelSection)

// Cache controls
const cacheSection = document.createElement('div')
cacheSection.style.cssText =
  'margin: 20px 0; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);'
const cacheTitle = document.createElement('div')
cacheTitle.textContent = 'Cache Management'
cacheTitle.style.cssText =
  'font-weight: bold; margin-bottom: 10px; color: #f59e0b;'
cacheSection.appendChild(cacheTitle)

const cacheInfo = document.createElement('div')
cacheInfo.style.cssText =
  'font-size: 12px; margin: 10px 0; color: rgba(255,255,255,0.6);'
cacheInfo.textContent = 'Cache size: 0 items'
cacheSection.appendChild(cacheInfo)

const updateCacheInfo = () => {
  cacheInfo.textContent = `Cache size: ${assetLoader.getCacheSize()} items`
}

const clearCacheBtn = UIHelpers.createButton(
  'Clear Cache',
  () => {
    assetLoader.clearCache()
    updateCacheInfo()
    updateStatusUI('Cache cleared')
  },
  'secondary'
)
cacheSection.appendChild(clearCacheBtn)

controlPanel.appendChild(cacheSection)

// Clear scene button
const clearSceneBtn = UIHelpers.createButton(
  'Clear Scene',
  () => {
    if (currentPlaceholder) {
      scene.remove(currentPlaceholder)
      currentPlaceholder = null
    }
    if (previewAsset) {
      scene.remove(previewAsset)
      previewAsset = null
    }
    loadedAssets.forEach((asset) => {
      scene.remove(asset)
    })
    loadedAssets.clear()
    latestAsset = null
    pendingAssetUpdates.length = 0
    if (fillAnimation) {
      cancelAnimationFrame(fillAnimation)
      fillAnimation = null
      animateFillBtn.textContent = 'Animate Fill'
    }
    progressBar.style.width = '0%'
    progressText.textContent = '0%'
    updateStatusUI('Scene cleared')
  },
  'danger'
)
controlPanel.appendChild(clearSceneBtn)

// Custom animation function
function customAnimation(deltaTime) {
  // Rotate reference objects
  refCube.rotation.x += 0.01
  refCube.rotation.y += 0.01

  refSphere.position.y = 0.5 + Math.sin(Date.now() * 0.001) * 0.3

  // Rotate loaded asset if present
  if (latestAsset) {
    // latestAsset.rotation.y += 0.005
  }

  // Rotate placeholder if present
  if (currentPlaceholder) {
    // currentPlaceholder.rotation.y += 0.01
  }

  // Update placeholder animation (for error state pulsing effect)
  assetLoader.updatePlaceholderAnimation(deltaTime || 0.016)
}

// Start animation using shared scene setup
sceneSetup.start(customAnimation)

console.log('Asset Loader Example loaded! 📦')
console.log('Features:')
console.log('- Placeholder with shader fill effect')
console.log('- Progress tracking with events')
console.log('- Support for GLTF, FBX, and OBJ formats')
console.log('- Asset caching system')
console.log('- Optional low-res model loading')
console.log('')
console.log('Usage:')
console.log('1. Create a placeholder to see the loading indicator')
console.log('2. Animate the fill effect to simulate loading progress')
console.log('3. Use the "Load GLTF at Random Position" button to spawn assets')
console.log('')
console.log('Example code:')
console.log(`
const loader = new AssetLoader()
await loader.load({
  type: 'gltf',
  url: '/path/to/model.gltf',
  size: [3, 3, 3], // Optional placeholder size
  lowResUrl: '/path/to/lowres.gltf', // Optional low-res version
  enableCaching: true
})
`)
