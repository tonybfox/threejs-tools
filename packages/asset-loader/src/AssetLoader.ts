import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { USDLoader } from 'three/examples/jsm/loaders/USDLoader.js'

// Event types for asset loading
interface AssetLoaderEventMap {
  progress: { loaded: number; total: number; percentage: number }
  loaded: { asset: THREE.Object3D }
  error: { error: Error }
  placeholderCreated: { placeholder: THREE.Object3D }
  lowResLoaded: { lowRes: THREE.Object3D }
}

export type AssetType = 'gltf' | 'fbx' | 'obj' | 'usd' | 'usdz'

export interface AssetLoaderOptions {
  type: AssetType
  url: string
  size?: [number, number, number] // Optional size for placeholder
  lowResUrl?: string // Optional low-res model URL
  enableCaching?: boolean
  placeholderColor?: number
  placeholderOpacity?: number
  errorColor?: number // Color to use when loading fails
  errorOpacity?: number // Opacity to use when loading fails
}

export class AssetLoader extends THREE.EventDispatcher<AssetLoaderEventMap> {
  private cache: Map<string, THREE.Object3D> = new Map()
  private gltfLoader: GLTFLoader
  private fbxLoader: FBXLoader
  private objLoader: OBJLoader
  private usdLoader: USDLoader
  private placeholder: THREE.Object3D | null = null
  private loadedAsset: THREE.Object3D | null = null
  private lowResAsset: THREE.Object3D | null = null
  private errorColor: number = 0xff4444
  private errorOpacity: number = 0.5

  constructor() {
    super()
    this.gltfLoader = new GLTFLoader()
    this.fbxLoader = new FBXLoader()
    this.objLoader = new OBJLoader()
    this.usdLoader = new USDLoader()
  }

  /**
   * Create a placeholder cube with shader effect
   */
  private createPlaceholder(
    size: [number, number, number],
    color: number = 0x4fc3f7,
    opacity: number = 0.3
  ): THREE.Object3D {
    const [width, height, depth] = size
    const geometry = new THREE.BoxGeometry(width, height, depth)

    // Custom shader material with fill-up effect
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true,
      uniforms: {
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity },
        fillProgress: { value: 0.0 },
        time: { value: 0.0 },
        isError: { value: 0.0 },
        yMin: { value: -height / 2 },
        yMax: { value: height / 2 },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        uniform float fillProgress;
        uniform float time;
        uniform float isError;
        uniform float yMin;
        uniform float yMax;
        varying vec3 vPosition;
        
        void main() {
          float normalizedY = (vPosition.y - yMin) / (yMax - yMin); // Normalize based on actual geometry bounds
          float alpha = opacity;
          
          // Create fill-up effect
          if (normalizedY > fillProgress) {
            alpha *= 0.1; // Reduce opacity for unfilled parts
          }
          
          // Error state effects
          if (isError > 0.5) {
            // Add pulsing effect for error state
            float pulse = 0.5 + 0.5 * sin(time * 4.0);
            alpha *= (0.3 + 0.4 * pulse);
            
            // Add error pattern
            float stripe = sin(vPosition.y * 20.0 + time * 2.0);
            alpha *= (0.7 + 0.3 * step(0.0, stripe));
          }
          
          // Add edge glow
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float edgeIntensity = pow(1.0 - abs(dot(viewDirection, normalize(vPosition))), 2.0);
          
          vec3 finalColor = color + edgeIntensity * 0.5;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    })

    const mesh = new THREE.Mesh(geometry, material)
    this.positionAssetAtBottomCenter(mesh)
    return mesh
  }

  /**
   * Update placeholder fill progress based on loading progress
   */
  private updatePlaceholder(progress: number) {
    if (this.placeholder && this.placeholder instanceof THREE.Mesh) {
      const material = this.placeholder.material as THREE.ShaderMaterial
      if (material.uniforms && material.uniforms.fillProgress) {
        material.uniforms.fillProgress.value = progress
      }
    }
  }

  /**
   * Set placeholder to error state with configurable color and opacity
   */
  private setPlaceholderError() {
    if (this.placeholder && this.placeholder instanceof THREE.Mesh) {
      const material = this.placeholder.material as THREE.ShaderMaterial
      if (material.uniforms) {
        // Change to error color
        if (material.uniforms.color) {
          material.uniforms.color.value = new THREE.Color(this.errorColor)
        }
        // Set error opacity
        if (material.uniforms.opacity) {
          material.uniforms.opacity.value = this.errorOpacity
        }
        // Set fill progress to indicate failure
        if (material.uniforms.fillProgress) {
          material.uniforms.fillProgress.value = 0.0
        }
        // Enable error state
        if (material.uniforms.isError) {
          material.uniforms.isError.value = 1.0
        }
      }
    }
  }

  /**
   * Update placeholder animation time (call this in your render loop)
   */
  public updatePlaceholderAnimation(deltaTime: number) {
    if (this.placeholder && this.placeholder instanceof THREE.Mesh) {
      const material = this.placeholder.material as THREE.ShaderMaterial
      if (material.uniforms && material.uniforms.time) {
        material.uniforms.time.value += deltaTime
      }
    }
  }

  /**
   * Reposition an asset so that its bottom-center sits at the local origin.
   */
  private positionAssetAtBottomCenter(object: THREE.Object3D) {
    object.updateMatrixWorld(true)

    const boundingBox = new THREE.Box3().setFromObject(object)
    if (boundingBox.isEmpty()) {
      return
    }

    const center = boundingBox.getCenter(new THREE.Vector3())
    const bottomCenter = new THREE.Vector3(
      center.x,
      boundingBox.min.y + 0.01,
      center.z
    )

    if (
      !Number.isFinite(bottomCenter.x) ||
      !Number.isFinite(bottomCenter.y) ||
      !Number.isFinite(bottomCenter.z)
    ) {
      return
    }

    object.position.sub(bottomCenter)
    object.userData.bottomCenterOffset = bottomCenter
    object.updateMatrixWorld(true)
  }

  private ensureBottomCenterOffset(
    object: THREE.Object3D
  ): THREE.Vector3 | null {
    const offset = object.userData.bottomCenterOffset
    if (offset instanceof THREE.Vector3) {
      return offset
    }

    if (offset && typeof offset === 'object') {
      const {
        x = 0,
        y = 0,
        z = 0,
      } = offset as Partial<Record<'x' | 'y' | 'z', number>>
      const normalized = new THREE.Vector3(x ?? 0, y ?? 0, z ?? 0)
      object.userData.bottomCenterOffset = normalized
      return normalized
    }

    return null
  }

  private normalizeBottomCenterData(object: THREE.Object3D): boolean {
    const hasOffset = this.ensureBottomCenterOffset(object) !== null
    object.children.forEach((child) => this.normalizeBottomCenterData(child))
    return hasOffset
  }

  /**
   * Load an asset with the specified options
   */
  async load(options: AssetLoaderOptions): Promise<THREE.Object3D> {
    const {
      type,
      url,
      size,
      lowResUrl,
      enableCaching = true,
      placeholderColor = 0x4fc3f7,
      placeholderOpacity = 0.4,
      errorColor = 0xff4444,
      errorOpacity = 0.5,
    } = options

    // Check cache first
    if (enableCaching && this.cache.has(url)) {
      const cachedClone = this.cache.get(url)!.clone(true)
      const hasOffset = this.normalizeBottomCenterData(cachedClone)

      if (!hasOffset) {
        this.positionAssetAtBottomCenter(cachedClone)
      } else {
        cachedClone.updateMatrixWorld(true)
      }

      this.loadedAsset = cachedClone
      this.dispatchEvent({ type: 'loaded', asset: cachedClone })
      return cachedClone
    }

    // Store error styling options
    this.errorColor = errorColor
    this.errorOpacity = errorOpacity

    // Create placeholder if size is provided
    if (size) {
      this.placeholder = this.createPlaceholder(
        size,
        placeholderColor,
        placeholderOpacity
      )
      this.dispatchEvent({
        type: 'placeholderCreated',
        placeholder: this.placeholder,
      })
    }

    try {
      // Load low-res model first if provided
      if (lowResUrl) {
        const lowRes = await this.loadModel(type, lowResUrl, true)
        this.lowResAsset = lowRes
        this.dispatchEvent({ type: 'lowResLoaded', lowRes })
      }

      // Load main asset
      const asset = await this.loadModel(type, url, false)
      this.loadedAsset = asset

      // Cache if enabled
      if (enableCaching) {
        const cacheEntry = asset.clone(true)
        const hasOffset = this.normalizeBottomCenterData(cacheEntry)
        if (!hasOffset) {
          this.positionAssetAtBottomCenter(cacheEntry)
        } else {
          cacheEntry.updateMatrixWorld(true)
        }
        this.cache.set(url, cacheEntry)
      }

      this.dispatchEvent({ type: 'loaded', asset })
      return asset
    } catch (error) {
      // Set placeholder to error state
      this.setPlaceholderError()
      this.dispatchEvent({ type: 'error', error: error as Error })
      throw error
    }
  }

  /**
   * Load a model based on type
   */
  private loadModel(
    type: AssetType,
    url: string,
    isLowRes: boolean
  ): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const onProgress = (event: ProgressEvent) => {
        // Handle cases where loaded > total (compressed content mismatch)
        // or total is 0 (unknown content length)
        let percentage = -1 // Default to indeterminate

        // Only calculate percentage if lengthComputable is true AND loaded <= total
        // This prevents false 100% when server reports compressed size
        if (
          event.lengthComputable &&
          event.total > 0 &&
          event.loaded <= event.total
        ) {
          percentage = (event.loaded / event.total) * 100
        }

        this.dispatchEvent({
          type: 'progress',
          loaded: event.loaded,
          total: event.total,
          percentage,
        })

        // Update placeholder fill only with valid percentage
        if (!isLowRes && percentage >= 0) {
          this.updatePlaceholder(percentage / 100)
        }
      }

      const onError = (error: unknown) => {
        reject(error)
      }

      switch (type) {
        case 'gltf':
          this.gltfLoader.load(
            url,
            (gltf) => {
              const scene = gltf.scene
              this.positionAssetAtBottomCenter(scene)
              resolve(scene)
            },
            onProgress,
            onError
          )
          break

        case 'fbx':
          this.fbxLoader.load(
            url,
            (fbx) => {
              this.positionAssetAtBottomCenter(fbx)
              resolve(fbx)
            },
            onProgress,
            onError
          )
          break

        case 'obj':
          this.objLoader.load(
            url,
            (obj) => {
              this.positionAssetAtBottomCenter(obj)
              resolve(obj)
            },
            onProgress,
            onError
          )
          break

        case 'usd':
        case 'usdz':
          this.usdLoader.load(
            url,
            (usd) => {
              this.positionAssetAtBottomCenter(usd)
              resolve(usd)
            },
            onProgress,
            onError
          )
          break

        default:
          reject(new Error(`Unsupported asset type: ${type}`))
      }
    })
  }

  /**
   * Get the placeholder object
   */
  getPlaceholder(): THREE.Object3D | null {
    return this.placeholder
  }

  /**
   * Get the loaded asset
   */
  getAsset(): THREE.Object3D | null {
    return this.loadedAsset
  }

  /**
   * Get the low-res asset
   */
  getLowResAsset(): THREE.Object3D | null {
    return this.lowResAsset
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Remove an item from cache
   */
  removeFromCache(url: string) {
    this.cache.delete(url)
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size
  }
}
