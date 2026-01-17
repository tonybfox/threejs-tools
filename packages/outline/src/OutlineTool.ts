import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { OutlineOptions, OutlineData } from './OutlineTypes'

/**
 * OutlineTool - Add outlines and edge lines to Three.js objects
 *
 * Features:
 * - Two rendering modes: mesh-based and post-processing
 * - Silhouette outlines using inverted hull technique
 * - Edge lines for geometry visualization
 * - Automatic updates when objects move/animate
 * - Exclusion filters for specific object types
 *
 * @example
 * ```typescript
 * const outlineTool = new OutlineTool(renderer, {
 *   outlineColor: 0xff0000,
 *   edgeLineWidth: 2,
 * })
 *
 * outlineTool.addObjects([mesh1, mesh2, mesh3])
 * ```
 */
export class OutlineTool {
  private options: Required<OutlineOptions>
  private outlineData: Map<string, OutlineData[]> = new Map()
  private lineMaterial: LineMaterial | null = null
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer | null = null
  private idRenderTarget: THREE.WebGLRenderTarget | null = null
  private idMaterial: THREE.MeshBasicMaterial | null = null

  /**
   * Default exclusion filter
   * Excludes Line2, LineSegments2, helpers, and gizmos
   */
  private static defaultExcludeFilter = (object: THREE.Object3D): boolean => {
    // Exclude Line2 and LineSegments2
    if (object.type === 'Line2' || object.type === 'LineSegments2') {
      return true
    }

    // Exclude helpers (GridHelper, AxesHelper, etc.)
    if (object.type.includes('Helper')) {
      return true
    }

    // Exclude objects with specific userData flags
    if (object.userData.excludeOutline) {
      return true
    }

    // Exclude arrows and gizmos by name pattern
    const name = object.name.toLowerCase()
    if (
      name.includes('arrow') ||
      name.includes('gizmo') ||
      name.includes('control')
    ) {
      return true
    }

    return false
  }

  constructor(renderer: THREE.WebGLRenderer, options: OutlineOptions = {}) {
    this.renderer = renderer

    // Merge with defaults
    this.options = {
      outlineColor: options.outlineColor ?? 0xff0000,
      edgeLineWidth: options.edgeLineWidth ?? 2,
      edgeLineColor: options.edgeLineColor ?? 0xff0000,
      edgeThreshold: options.edgeThreshold ?? 30,
      outlineScale: options.outlineScale ?? 1.02,
      enableSilhouette: options.enableSilhouette ?? true,
      enableEdgeLines: options.enableEdgeLines ?? true,
      edgeStrength: options.edgeStrength ?? 1.0,
      excludeFilter: options.excludeFilter ?? OutlineTool.defaultExcludeFilter,
    }

    // Create shared line material for mesh mode
    const size = renderer.getSize(new THREE.Vector2())
    this.lineMaterial = new LineMaterial({
      color: this.options.edgeLineColor,
      linewidth: this.options.edgeLineWidth,
      resolution: new THREE.Vector2(size.width, size.height),
    })

    // Update resolution on window resize
    window.addEventListener('resize', this.handleResize)
  }

  private handleResize = () => {
    const size = this.renderer.getSize(new THREE.Vector2())

    if (this.lineMaterial) {
      this.lineMaterial.resolution.set(size.width, size.height)
    }

    if (this.idRenderTarget) {
      this.idRenderTarget.setSize(size.width, size.height)
    }

    if (this.composer) {
      this.composer.setSize(size.width, size.height)
    }
  }

  /**
   * Add objects to be outlined
   * @param objects - Array of Three.js objects to outline
   */
  addObjects(objects: THREE.Object3D[]): void {
    objects.forEach((obj) => this.addObject(obj))
  }

  /**
   * Add a single object to be outlined
   * @param object - Three.js object to outline
   */
  addObject(object: THREE.Object3D): void {
    const uuid = object.uuid

    if (this.outlineData.has(uuid)) {
      console.warn(`Object ${object.name || uuid} is already outlined`)
      return
    }

    const outlines: OutlineData[] = []

    object.traverse((child) => {
      // Skip if not a mesh or excluded
      if (!this.isMesh(child) || this.options.excludeFilter(child)) {
        return
      }

      const mesh = child as THREE.Mesh
      const data: OutlineData = {
        originalObject: mesh,
        parent: mesh.parent!,
      }

      // Create silhouette outline
      if (this.options.enableSilhouette) {
        data.silhouetteMesh = this.createSilhouette(mesh)
        mesh.parent!.add(data.silhouetteMesh)
      }

      // Create edge lines
      if (this.options.enableEdgeLines) {
        data.edgeLines = this.createEdgeLines(mesh)
        mesh.parent!.add(data.edgeLines)
      }

      outlines.push(data)
    })

    if (outlines.length > 0) {
      this.outlineData.set(uuid, outlines)
    }
  }

  /**
   * Remove objects from outlining
   * @param objects - Array of objects to remove outlines from
   */
  removeObjects(objects: THREE.Object3D[]): void {
    objects.forEach((obj) => this.removeObject(obj))
  }

  /**
   * Remove a single object's outlines
   * @param object - Object to remove outlines from
   */
  removeObject(object: THREE.Object3D): void {
    const uuid = object.uuid
    const outlines = this.outlineData.get(uuid)

    if (!outlines) {
      return
    }

    // Remove all outline visuals
    outlines.forEach((data) => {
      if (data.silhouetteMesh) {
        data.parent.remove(data.silhouetteMesh)
        this.disposeMesh(data.silhouetteMesh)
      }
      if (data.edgeLines) {
        data.parent.remove(data.edgeLines)
        this.disposeLineSegments(data.edgeLines)
      }
      // Clean up ID color
      if (data.originalObject.userData.outlineIdColor) {
        delete data.originalObject.userData.outlineIdColor
      }
    })

    this.outlineData.delete(uuid)
  }

  /**
   * Clear all outlines
   */
  clearAll(): void {
    const objects = Array.from(this.outlineData.keys())
    objects.forEach((uuid) => {
      const outlines = this.outlineData.get(uuid)
      if (outlines && outlines.length > 0) {
        this.removeObject(outlines[0].originalObject.parent!)
      }
    })
  }

  /**
   * Update outlines to match current object transforms
   * Call this in your animation loop (for mesh mode only)
   */
  update(): void {
    this.outlineData.forEach((outlines) => {
      outlines.forEach((data) => {
        const mesh = data.originalObject as THREE.Mesh

        // Update silhouette position/rotation
        if (data.silhouetteMesh) {
          data.silhouetteMesh.position.copy(mesh.position)
          data.silhouetteMesh.rotation.copy(mesh.rotation)
          data.silhouetteMesh.quaternion.copy(mesh.quaternion)

          // Copy base scale then apply outline multiplier
          data.silhouetteMesh.scale.copy(mesh.scale)
          data.silhouetteMesh.scale.multiplyScalar(this.options.outlineScale)
        }

        // Update edge lines position/rotation/scale
        if (data.edgeLines) {
          data.edgeLines.position.copy(mesh.position)
          data.edgeLines.rotation.copy(mesh.rotation)
          data.edgeLines.quaternion.copy(mesh.quaternion)
          data.edgeLines.scale.copy(mesh.scale)
        }
      })
    })
  }

  /**
   * Render with outlines (for postprocess mode)
   * Call this instead of renderer.render() when using postprocess mode
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    // Render ID buffer first
    this.renderIdBuffer(scene, camera)

    this.composer!.render()
  }

  /**
   * Render the ID buffer for edge detection
   */
  private renderIdBuffer(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.idRenderTarget || !this.idMaterial) {
      return
    }

    const oldRT = this.renderer.getRenderTarget()
    const oldOverride = scene.overrideMaterial

    // Store original visibility
    const visibilityMap = new Map<THREE.Object3D, boolean>()

    // Hide all objects first, then only show outlined ones
    scene.traverse((obj) => {
      visibilityMap.set(obj, obj.visible)
      if (this.isMesh(obj) && !obj.userData.outlineIdColor) {
        obj.visible = false
      }
    })

    scene.overrideMaterial = this.idMaterial

    // Set per-mesh ID color
    scene.traverse((obj) => {
      if (!this.isMesh(obj)) return
      const mesh = obj as THREE.Mesh

      mesh.onBeforeRender = () => {
        const idColor = mesh.userData.outlineIdColor
        if (idColor) {
          this.idMaterial!.color.copy(idColor)
        }
      }
    })

    this.renderer.setRenderTarget(this.idRenderTarget)
    this.renderer.clear()
    this.renderer.render(scene, camera)

    // Cleanup
    scene.traverse((obj) => {
      if (!this.isMesh(obj)) return
      ;(obj as THREE.Mesh).onBeforeRender = () => {}

      // Restore visibility
      const originalVisibility = visibilityMap.get(obj)
      if (originalVisibility !== undefined) {
        obj.visible = originalVisibility
      }
    })

    scene.overrideMaterial = oldOverride
    this.renderer.setRenderTarget(oldRT)
  }

  /**
   * Update outline options
   * @param options - Partial options to update
   */
  setOptions(options: Partial<OutlineOptions>): void {
    const needsRecreate =
      options.outlineColor !== undefined ||
      options.edgeLineColor !== undefined ||
      options.edgeThreshold !== undefined ||
      options.enableSilhouette !== undefined ||
      options.enableEdgeLines !== undefined

    Object.assign(this.options, options)

    if (options.edgeLineWidth !== undefined) {
      this.lineMaterial.linewidth = options.edgeLineWidth
    }

    if (options.edgeLineColor !== undefined) {
      this.lineMaterial.color.setHex(options.edgeLineColor)
    }

    // If major options changed, recreate all outlines
    if (needsRecreate) {
      const objects: THREE.Object3D[] = []
      this.outlineData.forEach((outlines) => {
        if (outlines.length > 0) {
          // Get the root object
          let root = outlines[0].originalObject
          while (root.parent && !this.outlineData.has(root.parent.uuid)) {
            root = root.parent
          }
          objects.push(root)
        }
      })

      this.clearAll()
      this.addObjects(objects)
    }
  }

  /**
   * Create silhouette outline mesh
   */
  private createSilhouette(mesh: THREE.Mesh): THREE.Mesh {
    const outlineMesh = mesh.clone()

    // Create outline material
    outlineMesh.material = new THREE.MeshBasicMaterial({
      color: this.options.outlineColor,
      side: THREE.BackSide,
    })

    outlineMesh.renderOrder = -1
    outlineMesh.scale.multiplyScalar(this.options.outlineScale)

    // Mark as excluded to prevent recursive outlining
    outlineMesh.userData.excludeOutline = true

    return outlineMesh
  }

  /**
   * Create edge lines
   */
  private createEdgeLines(mesh: THREE.Mesh): LineSegments2 {
    if (!this.lineMaterial) {
      throw new Error('Line material not initialized')
    }

    const edges = new THREE.EdgesGeometry(
      mesh.geometry,
      this.options.edgeThreshold
    )
    const lineGeometry = new LineSegmentsGeometry()
    const positions = edges.attributes.position.array
    lineGeometry.setPositions(positions)

    const edgeLines = new LineSegments2(lineGeometry, this.lineMaterial)
    edgeLines.computeLineDistances()
    edgeLines.scale.copy(mesh.scale)
    edgeLines.rotation.copy(mesh.rotation)
    edgeLines.position.copy(mesh.position)

    // Mark as excluded
    edgeLines.userData.excludeOutline = true

    edges.dispose()

    return edgeLines
  }

  /**
   * Type guard for THREE.Mesh
   */
  private isMesh(object: THREE.Object3D): object is THREE.Mesh {
    return (object as THREE.Mesh).isMesh === true
  }

  /**
   * Dispose mesh and its resources
   */
  private disposeMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => mat.dispose())
    } else if (mesh.material) {
      mesh.material.dispose()
    }
  }

  /**
   * Dispose LineSegments2 and its resources
   */
  private disposeLineSegments(line: LineSegments2): void {
    if (line.geometry) {
      line.geometry.dispose()
    }
    // LineMaterial is shared, don't dispose it
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    this.clearAll()

    if (this.lineMaterial) {
      this.lineMaterial.dispose()
    }

    if (this.idRenderTarget) {
      this.idRenderTarget.dispose()
    }

    if (this.idMaterial) {
      this.idMaterial.dispose()
    }

    if (this.composer) {
      // Composer doesn't have a dispose method, but we can clean up passes
      this.composer = null
    }

    window.removeEventListener('resize', this.handleResize)
  }
}
