import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import {
  Measurement,
  MeasurementPoint,
  MeasurementData,
  MeasurementPointData,
  MeasurementToolOptions,
  MeasurementToolEvents,
  MeasurementCreationOptions,
  MeasurementOptions,
  SnapMode,
  SnapResult,
} from './MeasurementTypes'

/**
 * Main measurement tool class for Three.js scenes
 * Provides both programmatic and interactive measurement creation
 *
 * **Important**: This tool uses CSS2DObject for labels, which requires
 * CSS2DRenderer to be set up and rendered alongside your main WebGL renderer.
 *
 * @example
 * ```javascript
 * import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
 *
 * // Set up CSS2DRenderer
 * const css2dRenderer = new CSS2DRenderer()
 * css2dRenderer.setSize(window.innerWidth, window.innerHeight)
 * css2dRenderer.domElement.style.position = 'absolute'
 * css2dRenderer.domElement.style.top = '0'
 * css2dRenderer.domElement.style.pointerEvents = 'none'
 * document.body.appendChild(css2dRenderer.domElement)
 *
 * // In your animation loop:
 * function animate() {
 *   renderer.render(scene, camera)        // WebGL rendering
 *   css2dRenderer.render(scene, camera)   // CSS2D label rendering
 * }
 * ```
 */
export class MeasurementTool extends THREE.EventDispatcher<MeasurementToolEvents> {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private measurements: Measurement[] = []
  private raycaster: THREE.Raycaster = new THREE.Raycaster()

  // Interactive mode properties
  private isInteractive: boolean = false
  private domElement: HTMLElement | null = null
  private controls: { enabled: boolean } | null = null
  private defaultTargets: THREE.Object3D[] = []
  private activeTargets: THREE.Object3D[] = []
  private currentMeasurement: Partial<Measurement> | null = null
  private activeInteractionOptions: MeasurementOptions | null = null
  private pendingMeasurementOptions: MeasurementOptions | null = null
  private previewLine: THREE.Line | null = null
  private previewLabel: CSS2DObject | null = null
  private snapMarker: THREE.Sprite | null = null
  private originalCursor: string = ''
  private cursorHidden: boolean = false

  // Configuration defaults
  private defaultOptions: MeasurementOptions = {
    lineColor: 0xff0000,
    labelColor: '#ffffff',
    lineWidth: 2,
    fontSize: 16,
    fontFamily: 'Arial, sans-serif',
    snapMode: SnapMode.VERTEX,
    snapEnabled: true,
    snapDistance: 0.05,
    targets: [],
    isDynamic: false,
  }
  private previewColor: number = 0x00ffff
  private markerColor: number = 0x00ff00
  private markerSize: number = 0.08
  private markerVisible: boolean = true

  // Edit mode properties
  private isEditMode: boolean = false
  private editingMeasurement: Measurement | null = null
  private editingPoint: 'start' | 'end' | null = null
  private startEditSprite: THREE.Sprite | null = null
  private endEditSprite: THREE.Sprite | null = null
  private editSpriteMaterial: THREE.SpriteMaterial | null = null
  private isDragging: boolean = false

  // Materials
  private previewMaterial: THREE.LineDashedMaterial
  private markerMaterial: THREE.SpriteMaterial

  /**
   * Create a crosshair texture for the snap marker sprite
   */
  private createCrosshairTexture(): THREE.Texture {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')!
    const centerX = size / 2
    const centerY = size / 2
    const lineLength = 20
    const gap = 6

    // Clear canvas
    context.clearRect(0, 0, size, size)

    // Set line style
    context.strokeStyle = '#ffffff'
    context.lineWidth = 3
    context.lineCap = 'round'

    // Draw crosshair lines
    context.beginPath()

    // Horizontal line (left)
    context.moveTo(centerX - lineLength, centerY)
    context.lineTo(centerX - gap, centerY)

    // Horizontal line (right)
    context.moveTo(centerX + gap, centerY)
    context.lineTo(centerX + lineLength, centerY)

    // Vertical line (top)
    context.moveTo(centerX, centerY - lineLength)
    context.lineTo(centerX, centerY - gap)

    // Vertical line (bottom)
    context.moveTo(centerX, centerY + gap)
    context.lineTo(centerX, centerY + lineLength)

    context.stroke()

    // Add black outline for better visibility
    context.strokeStyle = '#000000'
    context.lineWidth = 5
    context.globalCompositeOperation = 'destination-over'

    context.beginPath()

    // Horizontal line (left)
    context.moveTo(centerX - lineLength, centerY)
    context.lineTo(centerX - gap, centerY)

    // Horizontal line (right)
    context.moveTo(centerX + gap, centerY)
    context.lineTo(centerX + lineLength, centerY)

    // Vertical line (top)
    context.moveTo(centerX, centerY - lineLength)
    context.lineTo(centerX, centerY - gap)

    // Vertical line (bottom)
    context.moveTo(centerX, centerY + gap)
    context.lineTo(centerX, centerY + lineLength)

    context.stroke()

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  /**
   * Create a dot texture for edit point sprites
   */
  private createDotTexture(): THREE.Texture {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')!
    const centerX = size / 2
    const centerY = size / 2
    const radius = 12

    // Clear canvas
    context.clearRect(0, 0, size, size)

    // Draw white circle
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.fill()

    // Add black outline
    context.strokeStyle = '#000000'
    context.lineWidth = 3
    context.beginPath()
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.stroke()

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: MeasurementToolOptions = {}
  ) {
    super()

    this.scene = scene
    this.camera = camera

    // Apply options (excluding domElement and controls which need special handling)
    const { domElement, controls } = options

    // Set DOM element if provided
    if (domElement) {
      this.domElement = domElement
    }

    // Set controls if provided
    if (controls) {
      this.controls = controls
    }

    this.previewMaterial = new THREE.LineDashedMaterial({
      color: this.previewColor,
      linewidth: this.defaultOptions.lineWidth,
      dashSize: 0.1,
      gapSize: 0.05,
    })

    this.markerMaterial = new THREE.SpriteMaterial({
      map: this.createCrosshairTexture(),
      color: this.markerColor,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false, // Keep constant size regardless of distance
      depthTest: false, // Always render in front of other objects
    })

    this.editSpriteMaterial = new THREE.SpriteMaterial({
      map: this.createDotTexture(),
      color: 0xffaa00, // Orange color for edit points
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      depthTest: false,
    })

    // Set up raycaster
    this.raycaster.params.Line.threshold = 0.01
    this.raycaster.params.Points.threshold = 0.01
  }

  /**
   * Create a measurement point that optionally tracks a scene object.
   */
  private createMeasurementPoint(
    worldPosition: THREE.Vector3,
    object?: THREE.Object3D,
    localPosition?: THREE.Vector3
  ): MeasurementPoint {
    if (!object) {
      return { position: worldPosition.clone() }
    }

    const anchorLocal =
      localPosition?.clone() ?? object.worldToLocal(worldPosition.clone())
    const resolvedWorld = object.localToWorld(anchorLocal.clone())

    return {
      position: resolvedWorld,
      anchor: {
        object,
        localPosition: anchorLocal,
      },
    }
  }

  /**
   * Update a measurement point's world position from its anchor (if dynamic)
   */
  private updateMeasurementPoint(point: MeasurementPoint): boolean {
    if (!point.anchor) {
      return false
    }

    const newWorldPosition = point.anchor.localPosition.clone()
    point.anchor.object.localToWorld(newWorldPosition)

    if (!point.position.equals(newWorldPosition)) {
      point.position.copy(newWorldPosition)
      return true
    }

    return false
  }

  /**
   * Add a measurement between two world positions with optional attachments.
   *
   * @param start - Starting world position
   * @param end - Ending world position
   * @param options - Optional configuration for the measurement
   */
  addMeasurement(
    start: THREE.Vector3,
    end: THREE.Vector3,
    options: MeasurementCreationOptions = {}
  ): Measurement {
    const hasAnchors = Boolean(options.startObject || options.endObject)
    const resolvedOptions = this.resolveMeasurementOptions(
      options,
      options.isDynamic ?? hasAnchors
    )

    const startPoint = this.createMeasurementPoint(
      start,
      options.startObject,
      options.startLocalPosition
    )
    const endPoint = this.createMeasurementPoint(
      end,
      options.endObject,
      options.endLocalPosition
    )

    return this.addMeasurementFromPoints(startPoint, endPoint, resolvedOptions, {
      id: options.id,
    })
  }

  private resolveMeasurementOptions(
    overrides: MeasurementCreationOptions = {},
    inferredDynamic?: boolean
  ): MeasurementOptions {
    let targetCandidates: THREE.Object3D[] | undefined

    if (overrides.targets && overrides.targets.length > 0) {
      targetCandidates = overrides.targets
    } else if (this.defaultOptions.targets.length > 0) {
      targetCandidates = this.defaultOptions.targets
    } else if (this.defaultTargets.length > 0) {
      targetCandidates = this.defaultTargets
    }

    const targets =
      targetCandidates && targetCandidates.length > 0
        ? targetCandidates
        : this.getAllMeshes()

    const isDynamic =
      overrides.isDynamic ??
      inferredDynamic ??
      this.defaultOptions.isDynamic

    return {
      lineColor: overrides.lineColor ?? this.defaultOptions.lineColor,
      labelColor: overrides.labelColor ?? this.defaultOptions.labelColor,
      lineWidth: overrides.lineWidth ?? this.defaultOptions.lineWidth,
      fontSize: overrides.fontSize ?? this.defaultOptions.fontSize,
      fontFamily: overrides.fontFamily ?? this.defaultOptions.fontFamily,
      snapMode: overrides.snapMode ?? this.defaultOptions.snapMode,
      snapEnabled: overrides.snapEnabled ?? this.defaultOptions.snapEnabled,
      snapDistance: overrides.snapDistance ?? this.defaultOptions.snapDistance,
      targets,
      isDynamic,
    }
  }

  private getActiveMeasurementOptions(): MeasurementOptions | null {
    if (this.isEditMode && this.editingMeasurement) {
      return this.editingMeasurement.options
    }

    return this.activeInteractionOptions
  }

  /**
   * @deprecated Use addMeasurement(obj1, obj2, { startLocalPos, endLocalPos }) instead
   * Add a dynamic measurement between two objects
   */
  addDynamicMeasurement(
    startObject: THREE.Object3D,
    endObject: THREE.Object3D,
    startLocalPos: THREE.Vector3 = new THREE.Vector3(),
    endLocalPos: THREE.Vector3 = new THREE.Vector3()
  ): Measurement {
    const startWorld = startObject.localToWorld(startLocalPos.clone())
    const endWorld = endObject.localToWorld(endLocalPos.clone())

    return this.addMeasurement(startWorld, endWorld, {
      startObject,
      endObject,
      startLocalPosition: startLocalPos,
      endLocalPosition: endLocalPos,
    })
  }

  /**
   * @deprecated Use addMeasurement(staticPos, targetObject, { endLocalPos }) instead
   * Add a measurement from a static point to a dynamic object
   */
  addMeasurementToObject(
    staticPos: THREE.Vector3,
    targetObject: THREE.Object3D,
    objectLocalPos: THREE.Vector3 = new THREE.Vector3()
  ): Measurement {
    const endWorld = targetObject.localToWorld(objectLocalPos.clone())

    return this.addMeasurement(staticPos, endWorld, {
      endObject: targetObject,
      endLocalPosition: objectLocalPos,
    })
  }

  /**
   * Core method to add a measurement from two measurement points
   */
  private addMeasurementFromPoints(
    start: MeasurementPoint,
    end: MeasurementPoint,
    options: MeasurementOptions,
    context?: { id?: string }
  ): Measurement {
    const id = context?.id || this.generateId()
    const distance = start.position.distanceTo(end.position)

    // Create line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints([
      start.position,
      end.position,
    ])
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: options.lineColor,
        linewidth: options.lineWidth,
      })
    )

    // Create label
    const label = this.createLabel(distance, options)
    const midpoint = start.position
      .clone()
      .add(end.position)
      .multiplyScalar(0.5)
    label.position.copy(midpoint)

    const measurement: Measurement = {
      id,
      start,
      end,
      line,
      label,
      distance,
      options: {
        ...options,
        targets: [...options.targets],
      },
    }

    // Add to scene and tracking
    this.scene.add(line)
    this.scene.add(label)
    this.measurements.push(measurement)

    // Dispatch event
    this.dispatchEvent({
      type: 'measurementCreated',
      measurement,
    })

    return measurement
  }

  /**
   * Update all dynamic measurements in real-time
   * Call this in your animation loop to keep dynamic measurements up-to-date
   */
  updateDynamicMeasurements(): boolean {
    let updated = false

    for (const measurement of this.measurements) {
      if (!measurement.options.isDynamic) continue

      let needsUpdate = false

      // Update start point
      if (this.updateMeasurementPoint(measurement.start)) {
        needsUpdate = true
      }

      // Update end point
      if (this.updateMeasurementPoint(measurement.end)) {
        needsUpdate = true
      }

      if (needsUpdate) {
        // Recalculate distance
        const newDistance = measurement.start.position.distanceTo(
          measurement.end.position
        )
        measurement.distance = newDistance

        // Update line geometry
        const positions = [measurement.start.position, measurement.end.position]
        measurement.line.geometry.setFromPoints(positions)
        measurement.line.geometry.attributes.position.needsUpdate = true

        // Update label position and text
        const midpoint = measurement.start.position
          .clone()
          .add(measurement.end.position)
          .multiplyScalar(0.5)
        measurement.label.position.copy(midpoint)
        this.updateLabelText(measurement.label.element, newDistance)

        updated = true
      }
    }

    return updated
  }

  /**
   * Set whether interactive measurements should be dynamic or static
   */
  setDynamicMode(enabled: boolean): void {
    this.setDefaultMeasurementOptions({ isDynamic: enabled })
  }

  /**
   * Get the current dynamic mode state
   */
  getDynamicMode(): boolean {
    return this.defaultOptions.isDynamic
  }

  /**
   * Enter edit mode for a specific measurement
   * Shows edit sprites at the measurement endpoints
   * @param measurementIdOrIndex - The measurement ID or index
   * @param targets - Optional target objects for snapping during edit
   */
  enterEditMode(
    measurementIdOrIndex: string | number,
    targets?: THREE.Object3D[]
  ): void {
    // Exit any current edit mode
    this.exitEditMode()

    // Find the measurement
    let measurement: Measurement | undefined
    if (typeof measurementIdOrIndex === 'string') {
      measurement = this.measurements.find((m) => m.id === measurementIdOrIndex)
    } else {
      measurement = this.measurements[measurementIdOrIndex]
    }

    if (!measurement) {
      console.warn('Measurement not found:', measurementIdOrIndex)
      return
    }

    if (!this.domElement) {
      console.warn(
        'DOM element not set. Call setDomElement() or enableInteraction() first.'
      )
      return
    }

    this.isEditMode = true
    this.editingMeasurement = measurement

    // Select targets for editing
    const resolvedTargets =
      targets && targets.length > 0
        ? targets
        : measurement.options.targets.length > 0
        ? measurement.options.targets
        : this.getAllMeshes()

    this.activeTargets = resolvedTargets

    // Persist overrides so future edits reuse them
    if (targets && targets.length > 0) {
      measurement.options.targets = [...targets]
    }

    // Create edit sprites at the endpoints
    this.createEditSprites()

    // Set up event listeners for dragging
    this.domElement.addEventListener('mousedown', this.onEditMouseDown)
    this.domElement.addEventListener('mousemove', this.onEditMouseMove)
    this.domElement.addEventListener('mouseup', this.onEditMouseUp)
    this.domElement.style.cursor = 'pointer'

    this.dispatchEvent({
      type: 'editModeEntered',
      measurement,
    })
  }

  /**
   * Exit edit mode
   */
  exitEditMode(): void {
    if (!this.isEditMode) return

    const measurement = this.editingMeasurement

    // Remove edit sprites
    this.removeEditSprites()

    // Remove event listeners
    if (this.domElement) {
      this.domElement.removeEventListener('mousedown', this.onEditMouseDown)
      this.domElement.removeEventListener('mousemove', this.onEditMouseMove)
      this.domElement.removeEventListener('mouseup', this.onEditMouseUp)
      this.domElement.style.cursor = this.isInteractive
        ? 'crosshair'
        : 'default'
    }

    this.isEditMode = false
    this.editingMeasurement = null
    this.editingPoint = null
    this.isDragging = false
    this.activeTargets = []

    if (measurement) {
      this.dispatchEvent({
        type: 'editModeExited',
        measurement,
      })
    }
  }

  /**
   * Set the DOM element for interactions (both measurement and edit mode)
   */
  setDomElement(domElement: HTMLElement): void {
    this.domElement = domElement
  }

  /**
   * Set the camera controls to disable during edit dragging
   */
  setControls(controls: { enabled: boolean }): void {
    this.controls = controls
  }

  /**
   * Set target objects for snapping (used in both interactive mode and edit mode)
   */
  setTargetObjects(targets: THREE.Object3D[]): void {
    this.defaultTargets = targets.length > 0 ? targets : this.getAllMeshes()
    this.defaultOptions.targets = [...this.defaultTargets]
  }

  /**
   * Update default measurement options used when none are provided explicitly.
   */
  setDefaultMeasurementOptions(
    options: Partial<MeasurementCreationOptions>
  ): void {
    if (options.lineColor !== undefined) {
      this.defaultOptions.lineColor = options.lineColor
    }
    if (options.labelColor !== undefined) {
      this.defaultOptions.labelColor = options.labelColor
    }
    if (options.lineWidth !== undefined) {
      this.defaultOptions.lineWidth = options.lineWidth
    }
    if (options.fontSize !== undefined) {
      this.defaultOptions.fontSize = options.fontSize
    }
    if (options.fontFamily !== undefined) {
      this.defaultOptions.fontFamily = options.fontFamily
    }
    if (options.snapMode !== undefined) {
      this.defaultOptions.snapMode = options.snapMode
    }
    if (options.snapEnabled !== undefined) {
      this.defaultOptions.snapEnabled = options.snapEnabled
    }
    if (options.snapDistance !== undefined) {
      this.defaultOptions.snapDistance = options.snapDistance
    }
    if (options.targets !== undefined) {
      this.defaultTargets = options.targets
      this.defaultOptions.targets = [...options.targets]
      if (this.activeInteractionOptions) {
        this.activeInteractionOptions.targets = [...options.targets]
        this.activeTargets = options.targets
      }
    }
    if (options.isDynamic !== undefined) {
      this.defaultOptions.isDynamic = options.isDynamic
      if (this.activeInteractionOptions) {
        this.activeInteractionOptions.isDynamic = options.isDynamic
      }
    }

    if (this.activeInteractionOptions) {
      if (options.lineColor !== undefined) {
        this.activeInteractionOptions.lineColor = options.lineColor
      }
      if (options.labelColor !== undefined) {
        this.activeInteractionOptions.labelColor = options.labelColor
      }
      if (options.lineWidth !== undefined) {
        this.activeInteractionOptions.lineWidth = options.lineWidth
      }
      if (options.fontSize !== undefined) {
        this.activeInteractionOptions.fontSize = options.fontSize
      }
      if (options.fontFamily !== undefined) {
        this.activeInteractionOptions.fontFamily = options.fontFamily
      }
      if (options.snapMode !== undefined) {
        this.activeInteractionOptions.snapMode = options.snapMode
      }
      if (options.snapEnabled !== undefined) {
        this.activeInteractionOptions.snapEnabled = options.snapEnabled
      }
      if (options.snapDistance !== undefined) {
        this.activeInteractionOptions.snapDistance = options.snapDistance
      }
    }
  }

  /**
   * Disable camera controls (used during edit dragging)
   */
  private disableControls(): void {
    if (this.controls) {
      this.controls.enabled = false
    }
  }

  /**
   * Enable camera controls (used after edit dragging)
   */
  private enableControls(): void {
    if (this.controls) {
      this.controls.enabled = true
    }
  }

  /**
   * Enable interactive measurement mode
   */
  enableInteraction(options: MeasurementCreationOptions = {}): void {
    if (this.isInteractive) {
      this.disableInteraction()
    }

    const resolvedOptions = this.resolveMeasurementOptions(options)
    this.activeInteractionOptions = {
      ...resolvedOptions,
      targets: [...resolvedOptions.targets],
    }
    this.activeTargets =
      this.activeInteractionOptions.targets.length > 0
        ? this.activeInteractionOptions.targets
        : this.getAllMeshes()

    this.isInteractive = true

    if (this.domElement) {
      // Add event listeners
      this.domElement.addEventListener('click', this.onMouseClick)
      this.domElement.addEventListener('mousemove', this.onMouseMove)
      this.domElement.addEventListener('keydown', this.onKeyDown)

      // Set cursor style
      this.domElement.style.cursor = 'crosshair'
    }
    // Create snap marker
    this.createSnapMarker()

    this.dispatchEvent({ type: 'started' })
  }

  /**
   * Disable interactive measurement mode
   */
  disableInteraction(): void {
    if (!this.isInteractive || !this.domElement) return

    // Exit edit mode if active
    this.exitEditMode()

    // Remove event listeners
    this.domElement.removeEventListener('click', this.onMouseClick)
    this.domElement.removeEventListener('mousemove', this.onMouseMove)
    this.domElement.removeEventListener('keydown', this.onKeyDown)

    // Reset cursor
    this.showCursor()
    this.domElement.style.cursor = 'default'

    // Clean up current measurement
    this.cancelCurrentMeasurement()

    // Remove snap marker
    this.removeSnapMarker()

    this.isInteractive = false
    this.activeInteractionOptions = null
    this.activeTargets = []

    this.dispatchEvent({ type: 'ended' })
  }

  /**
   * Remove the last measurement (undo)
   */
  undoLast(): void {
    if (this.measurements.length === 0) return

    const lastMeasurement = this.measurements.pop()!
    this.removeMeasurementFromScene(lastMeasurement)

    this.dispatchEvent({
      type: 'measurementRemoved',
      measurement: lastMeasurement,
    })
  }

  /**
   * Remove a specific measurement
   */
  removeMeasurement(measurement: Measurement): void {
    const index = this.measurements.indexOf(measurement)
    if (index === -1) return

    this.measurements.splice(index, 1)
    this.removeMeasurementFromScene(measurement)

    this.dispatchEvent({
      type: 'measurementRemoved',
      measurement,
    })
  }

  /**
   * Clear all measurements
   */
  clearAll(): void {
    const count = this.measurements.length

    this.measurements.forEach((measurement) => {
      this.removeMeasurementFromScene(measurement)
    })

    this.measurements = []

    this.dispatchEvent({
      type: 'measurementsCleared',
      count,
    })
  }

  /**
   * Get all measurements
   */
  getMeasurements(): Measurement[] {
    return [...this.measurements]
  }

  /**
   * Convert a MeasurementPoint to serializable data
   */
  private serializeMeasurementPoint(
    point: MeasurementPoint
  ): MeasurementPointData {
    return {
      position: point.position.toArray() as [number, number, number],
      anchorObjectId: point.anchor?.object.uuid,
      anchorLocalPosition: point.anchor
        ? (point.anchor.localPosition.toArray() as [number, number, number])
        : undefined,
    }
  }

  /**
   * Serialize measurements to JSON-compatible format
   * Note: Dynamic measurements will lose their object references and become static when deserialized
   */
  serialize(): MeasurementData[] {
    return this.measurements.map((measurement) => ({
      id: measurement.id,
      start: this.serializeMeasurementPoint(measurement.start),
      end: this.serializeMeasurementPoint(measurement.end),
      distance: measurement.distance,
      options: {
        snapMode: measurement.options.snapMode,
        snapEnabled: measurement.options.snapEnabled,
        snapDistance: measurement.options.snapDistance,
        lineColor: measurement.options.lineColor,
        labelColor: measurement.options.labelColor,
        lineWidth: measurement.options.lineWidth,
        fontSize: measurement.options.fontSize,
        fontFamily: measurement.options.fontFamily,
        isDynamic: measurement.options.isDynamic,
        targetObjectIds: measurement.options.targets.map((obj) => obj.uuid),
      },
    }))
  }

  /**
   * Deserialize measurements from JSON data
   * Note: Dynamic measurements become static since object references are lost
   */
  deserialize(data: MeasurementData[]): void {
    // Clear existing measurements
    this.clearAll()

    data.forEach((item) => {
      const start = new THREE.Vector3().fromArray(item.start.position)
      const end = new THREE.Vector3().fromArray(item.end.position)

      const startObject = item.start.anchorObjectId
        ? (this.scene.getObjectByProperty(
            'uuid',
            item.start.anchorObjectId
          ) as THREE.Object3D | null)
        : null
      const endObject = item.end.anchorObjectId
        ? (this.scene.getObjectByProperty(
            'uuid',
            item.end.anchorObjectId
          ) as THREE.Object3D | null)
        : null

      const restoredTargets =
        item.options.targetObjectIds && item.options.targetObjectIds.length > 0
          ? (item.options.targetObjectIds
              .map((uuid) => this.scene.getObjectByProperty('uuid', uuid))
              .filter((obj) => obj !== undefined) as THREE.Object3D[])
          : undefined

      this.addMeasurement(start, end, {
        id: item.id,
        targets:
          restoredTargets && restoredTargets.length > 0
            ? restoredTargets
            : undefined,
        snapMode: item.options.snapMode,
        snapEnabled: item.options.snapEnabled,
        snapDistance: item.options.snapDistance,
        lineColor: item.options.lineColor,
        labelColor: item.options.labelColor,
        lineWidth: item.options.lineWidth,
        fontSize: item.options.fontSize,
        fontFamily: item.options.fontFamily,
        isDynamic: item.options.isDynamic,
        startObject: startObject || undefined,
        startLocalPosition: item.start.anchorLocalPosition
          ? new THREE.Vector3().fromArray(item.start.anchorLocalPosition)
          : undefined,
        endObject: endObject || undefined,
        endLocalPosition: item.end.anchorLocalPosition
          ? new THREE.Vector3().fromArray(item.end.anchorLocalPosition)
          : undefined,
      })
    })
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.exitEditMode()
    this.disableInteraction()
    this.clearAll()

    this.previewMaterial.dispose()

    if (this.markerMaterial.map) {
      this.markerMaterial.map.dispose()
    }
    this.markerMaterial.dispose()

    if (this.editSpriteMaterial) {
      if (this.editSpriteMaterial.map) {
        this.editSpriteMaterial.map.dispose()
      }
      this.editSpriteMaterial.dispose()
    }
  }

  // Private methods

  private onMouseClick = (event: MouseEvent): void => {
    if (!this.isInteractive) return

    const snapResult = this.getSnapResult(event)
    if (!snapResult) return

    if (!this.currentMeasurement) {
      // Start new measurement
      this.startMeasurement(snapResult)
    } else {
      // Complete measurement
      this.completeMeasurement(snapResult)
    }
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isInteractive) return

    const snapResult = this.getSnapResult(event)
    if (!snapResult) {
      this.hideSnapMarker()
      this.showCursor()
      return
    }

    if (!this.currentMeasurement) {
      // Show marker for potential start point and hide cursor
      this.updateSnapMarker(snapResult.point, true)
      this.hideCursor()
    } else {
      // Show marker for potential end point and hide cursor
      this.updateSnapMarker(snapResult.point, true)
      this.hideCursor()
      this.updatePreview(snapResult.point)
    }
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.isInteractive) return

    if (event.key === 'Escape') {
      this.cancelCurrentMeasurement()
    }
  }

  private hideCursor(): void {
    if (!this.domElement || this.cursorHidden) return

    this.originalCursor = this.domElement.style.cursor
    this.domElement.style.cursor = 'none'
    this.cursorHidden = true
  }

  private showCursor(): void {
    if (!this.domElement || !this.cursorHidden) return

    this.domElement.style.cursor = this.originalCursor || 'crosshair'
    this.cursorHidden = false
  }

  private createSnapMarker(): void {
    if (!this.markerVisible) return

    // Remove existing snap marker if it exists
    if (this.snapMarker) {
      this.scene.remove(this.snapMarker)
    }

    this.snapMarker = new THREE.Sprite(this.markerMaterial)
    this.snapMarker.scale.setScalar(this.markerSize)
    this.snapMarker.visible = false

    // Ensure marker always renders in front
    this.snapMarker.renderOrder = 999
    this.snapMarker.material.depthTest = false

    this.scene.add(this.snapMarker)
  }

  private updateSnapMarker(
    point: THREE.Vector3,
    visible: boolean = true
  ): void {
    if (!this.snapMarker || !this.markerVisible) return

    this.snapMarker.position.copy(point)
    this.snapMarker.visible = visible
  }

  private hideSnapMarker(): void {
    if (this.snapMarker) {
      this.snapMarker.visible = false
    }
  }

  private removeSnapMarker(): void {
    if (this.snapMarker) {
      this.scene.remove(this.snapMarker)
      this.snapMarker = null
    }
  }

  private startMeasurement(snapResult: SnapResult): void {
    const id = this.generateId()
    const point = snapResult.point
    const baseOptions =
      this.activeInteractionOptions ?? this.defaultOptions
    const measurementOptions: MeasurementOptions = {
      ...baseOptions,
      targets: [...baseOptions.targets],
    }
    this.pendingMeasurementOptions = measurementOptions

    // Hide snap marker temporarily while creating preview
    this.hideSnapMarker()

    // Create preview line
    const geometry = new THREE.BufferGeometry().setFromPoints([point, point])
    this.previewLine = new THREE.Line(geometry, this.previewMaterial)
    this.previewLine.computeLineDistances() // For dashed material
    this.scene.add(this.previewLine)

    // Create preview label
    this.previewLabel = this.createLabel(0, measurementOptions)
    this.previewLabel.position.copy(point)
    this.scene.add(this.previewLabel)

    const startPoint =
      measurementOptions.isDynamic && snapResult.object
        ? this.createMeasurementPoint(point, snapResult.object)
        : this.createMeasurementPoint(point)

    this.currentMeasurement = {
      id,
      start: startPoint,
    }
  }

  private updatePreview(point: THREE.Vector3): void {
    if (!this.currentMeasurement || !this.previewLine || !this.previewLabel)
      return

    const start = this.currentMeasurement.start!
    const distance = start.position.distanceTo(point)

    // Update preview line
    const geometry = new THREE.BufferGeometry().setFromPoints([
      start.position,
      point,
    ])
    this.previewLine.geometry.dispose()
    this.previewLine.geometry = geometry
    this.previewLine.computeLineDistances()

    // Update preview label
    const midpoint = start.position.clone().add(point).multiplyScalar(0.5)
    this.previewLabel.position.copy(midpoint)
    this.updateLabelText(this.previewLabel.element, distance)

    this.dispatchEvent({
      type: 'previewUpdated',
      start: start.position,
      current: point,
      distance,
    })
  }

  private completeMeasurement(snapResult: SnapResult): void {
    if (!this.currentMeasurement) return

    const start = this.currentMeasurement.start!
    const point = snapResult.point
    const options =
      this.pendingMeasurementOptions ??
      this.activeInteractionOptions ??
      this.defaultOptions

    this.disableInteraction()

    // Clean up preview
    this.cleanupPreview()

    const resolvedOptions: MeasurementOptions = {
      ...options,
      targets: [...options.targets],
    }

    const endPoint =
      resolvedOptions.isDynamic && snapResult.object
        ? this.createMeasurementPoint(point, snapResult.object)
        : this.createMeasurementPoint(point)

    // Create actual measurement using the measurement points
    this.addMeasurementFromPoints(start, endPoint, resolvedOptions)

    // Reset current measurement and object references
    this.currentMeasurement = null
    this.pendingMeasurementOptions = null

    // Re-create snap marker for next measurement
    this.createSnapMarker()
  }

  private cancelCurrentMeasurement(): void {
    this.cleanupPreview()
    this.currentMeasurement = null
    this.pendingMeasurementOptions = null

    // Re-create snap marker after canceling
    this.createSnapMarker()
  }

  private cleanupPreview(): void {
    if (this.previewLine) {
      this.scene.remove(this.previewLine)
      this.previewLine.geometry.dispose()
      this.previewLine = null
    }

    if (this.previewLabel) {
      this.scene.remove(this.previewLabel)
      // CSS2DObject cleanup - remove the HTML element from DOM
      if (this.previewLabel.element.parentNode) {
        this.previewLabel.element.parentNode.removeChild(
          this.previewLabel.element
        )
      }
      this.previewLabel = null
    }
  }

  private getSnapResult(event: MouseEvent): SnapResult | null {
    const mouse = new THREE.Vector2()
    const rect = this.domElement!.getBoundingClientRect()

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    const options =
      this.getActiveMeasurementOptions() ?? this.defaultOptions
    const targets =
      this.activeTargets.length > 0
        ? this.activeTargets
        : options.targets.length > 0
        ? options.targets
        : this.getAllMeshes()

    this.raycaster.setFromCamera(mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(targets, true)

    if (intersects.length === 0) return null

    const intersection = intersects[0]
    let snapPoint = intersection.point.clone()
    let snapped = false
    let snapMode = SnapMode.DISABLED

    if (options.snapEnabled) {
      const snapResult = this.performSnapping(intersection, options)
      snapPoint = snapResult.point
      snapped = snapResult.snapped
      snapMode = snapResult.snapMode
    }

    return {
      point: snapPoint,
      originalPoint: intersection.point,
      snapped,
      snapMode,
      object: intersection.object,
    }
  }

  private performSnapping(
    intersection: THREE.Intersection,
    options: MeasurementOptions
  ): SnapResult {
    const originalPoint = intersection.point
    let snapPoint = originalPoint.clone()
    let snapped = false
    let snapMode = SnapMode.DISABLED

    if (options.snapMode === SnapMode.VERTEX) {
      const vertexSnap = this.snapToVertex(intersection, options.snapDistance)
      if (vertexSnap) {
        snapPoint = vertexSnap
        snapped = true
        snapMode = SnapMode.VERTEX
      }
    } else if (options.snapMode === SnapMode.FACE) {
      // Face snapping uses the intersection point (already on face)
      snapped = true
      snapMode = SnapMode.FACE
    }

    return {
      point: snapPoint,
      originalPoint,
      snapped,
      snapMode,
      object: intersection.object,
    }
  }

  private snapToVertex(
    intersection: THREE.Intersection,
    snapDistance: number
  ): THREE.Vector3 | null {
    const geometry = (intersection.object as THREE.Mesh).geometry
    if (!geometry.attributes.position) return null

    const positions = geometry.attributes.position
    const worldMatrix = intersection.object.matrixWorld
    const closestVertex = new THREE.Vector3()
    let minDistance = Infinity
    let found = false

    // Check all vertices
    for (let i = 0; i < positions.count; i++) {
      const vertex = new THREE.Vector3()
      vertex.fromBufferAttribute(positions, i)
      vertex.applyMatrix4(worldMatrix)

      const distance = vertex.distanceTo(intersection.point)
      if (distance < snapDistance && distance < minDistance) {
        minDistance = distance
        closestVertex.copy(vertex)
        found = true
      }
    }

    return found ? closestVertex : null
  }

  private createLabel(
    distance: number,
    options: MeasurementOptions
  ): CSS2DObject {
    // Create HTML element for the label
    const labelDiv = document.createElement('div')
    labelDiv.className = 'measurement-label'

    // Set styles for the label
    Object.assign(labelDiv.style, {
      color: options.labelColor,
      fontSize: `${options.fontSize}px`,
      fontFamily: options.fontFamily,
      fontWeight: 'bold',
      background: 'rgba(0, 0, 0, 0.9)',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      pointerEvents: 'auto', // Enable pointer events for double-click
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
      zIndex: '1000',
      cursor: 'pointer',
    })

    // Update the text content
    this.updateLabelText(labelDiv, distance)

    // Create CSS2DObject
    const css2dObject = new CSS2DObject(labelDiv)

    // Add double-click event listener to enter edit mode
    labelDiv.addEventListener('dblclick', (event) => {
      event.stopPropagation()
      // Find the measurement that owns this label
      const measurement = this.measurements.find((m) => m.label === css2dObject)
      if (measurement) {
        this.enterEditMode(measurement.id)
      }
    })

    return css2dObject
  }

  private updateLabelText(element: HTMLElement, distance: number): void {
    const text = `${distance.toFixed(2)}m`
    element.textContent = text
  }

  private removeMeasurementFromScene(measurement: Measurement): void {
    this.scene.remove(measurement.line)
    this.scene.remove(measurement.label)

    measurement.line.geometry.dispose()
    if (measurement.line.material instanceof THREE.Material) {
      measurement.line.material.dispose()
    }

    // CSS2DObject cleanup - remove the HTML element from DOM
    if (measurement.label.element.parentNode) {
      measurement.label.element.parentNode.removeChild(
        measurement.label.element
      )
    }
  }

  private getAllMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = []

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshes.push(object)
      }
    })

    return meshes
  }

  private generateId(): string {
    return `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Edit mode helper methods

  private createEditSprites(): void {
    if (!this.editingMeasurement || !this.editSpriteMaterial) return

    const measurement = this.editingMeasurement

    // Create start point sprite
    this.startEditSprite = new THREE.Sprite(this.editSpriteMaterial.clone())
    this.startEditSprite.position.copy(measurement.start.position)
    this.startEditSprite.scale.set(this.markerSize, this.markerSize, 1)
    this.startEditSprite.userData.editPoint = 'start'
    this.scene.add(this.startEditSprite)

    // Create end point sprite
    this.endEditSprite = new THREE.Sprite(this.editSpriteMaterial.clone())
    this.endEditSprite.position.copy(measurement.end.position)
    this.endEditSprite.scale.set(this.markerSize, this.markerSize, 1)
    this.endEditSprite.userData.editPoint = 'end'
    this.scene.add(this.endEditSprite)
  }

  private removeEditSprites(): void {
    if (this.startEditSprite) {
      this.scene.remove(this.startEditSprite)
      if (this.startEditSprite.material instanceof THREE.Material) {
        this.startEditSprite.material.dispose()
      }
      this.startEditSprite = null
    }

    if (this.endEditSprite) {
      this.scene.remove(this.endEditSprite)
      if (this.endEditSprite.material instanceof THREE.Material) {
        this.endEditSprite.material.dispose()
      }
      this.endEditSprite = null
    }
  }

  private onEditMouseDown = (event: MouseEvent): void => {
    if (!this.isEditMode || !this.domElement) return
    const mouse = new THREE.Vector2()
    const rect = this.domElement.getBoundingClientRect()

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(mouse, this.camera)

    // Check if clicking on edit sprites
    const sprites = [this.startEditSprite, this.endEditSprite].filter(
      (s) => s !== null
    ) as THREE.Sprite[]
    const spriteIntersects = this.raycaster.intersectObjects(sprites)

    if (spriteIntersects.length > 0) {
      const sprite = spriteIntersects[0].object
      this.editingPoint = sprite.userData.editPoint as 'start' | 'end'
      this.isDragging = true

      // Disable camera controls during dragging
      this.disableControls()

      // Hide the edit sprite being dragged and show crosshair marker
      if (this.editingPoint === 'start' && this.startEditSprite) {
        this.startEditSprite.visible = false
      } else if (this.editingPoint === 'end' && this.endEditSprite) {
        this.endEditSprite.visible = false
      }

      // Show snap marker
      this.createSnapMarker()
      if (this.snapMarker) {
        this.snapMarker.position.copy(sprite.position)
        this.snapMarker.visible = true
      }

      // Hide cursor
      this.hideCursor()
    }
  }

  private onEditMouseMove = (event: MouseEvent): void => {
    if (!this.isEditMode || !this.isDragging || !this.editingMeasurement) return

    const snapResult = this.getSnapResult(event)
    if (!snapResult) return

    // Update snap marker position
    if (this.snapMarker) {
      this.snapMarker.position.copy(snapResult.point)
      this.snapMarker.visible = this.markerVisible
    }

    // Update the measurement preview
    if (this.editingPoint === 'start') {
      this.updateMeasurementPreview(
        snapResult.point,
        this.editingMeasurement.end.position
      )
    } else if (this.editingPoint === 'end') {
      this.updateMeasurementPreview(
        this.editingMeasurement.start.position,
        snapResult.point
      )
    }
  }

  private onEditMouseUp = (event: MouseEvent): void => {
    if (
      !this.isEditMode ||
      !this.isDragging ||
      !this.editingMeasurement ||
      !this.editingPoint
    )
      return

    const snapResult = this.getSnapResult(event)
    if (!snapResult) {
      this.cancelEdit()
      return
    }

    // Update the measurement point
    const point =
      this.editingPoint === 'start'
        ? this.editingMeasurement.start
        : this.editingMeasurement.end

    // Update position
    point.position.copy(snapResult.point)

    // Update dynamic point data if applicable
    const measurementOptions = this.editingMeasurement.options
    if (measurementOptions.isDynamic && snapResult.object) {
      const localPos = snapResult.object.worldToLocal(snapResult.point.clone())
      point.anchor = {
        object: snapResult.object,
        localPosition: localPos,
      }
    } else {
      // Make it static
      point.anchor = undefined
    }

    // Recalculate distance and update geometry
    const newDistance = this.editingMeasurement.start.position.distanceTo(
      this.editingMeasurement.end.position
    )
    this.editingMeasurement.distance = newDistance

    // Update line geometry
    const positions = [
      this.editingMeasurement.start.position,
      this.editingMeasurement.end.position,
    ]
    this.editingMeasurement.line.geometry.setFromPoints(positions)
    this.editingMeasurement.line.geometry.attributes.position.needsUpdate = true

    // Update label position and text
    const midpoint = this.editingMeasurement.start.position
      .clone()
      .add(this.editingMeasurement.end.position)
      .multiplyScalar(0.5)
    this.editingMeasurement.label.position.copy(midpoint)
    this.updateLabelText(this.editingMeasurement.label.element, newDistance)

    // Update edit sprite positions
    if (this.startEditSprite) {
      this.startEditSprite.position.copy(this.editingMeasurement.start.position)
      this.startEditSprite.visible = true
    }
    if (this.endEditSprite) {
      this.endEditSprite.position.copy(this.editingMeasurement.end.position)
      this.endEditSprite.visible = true
    }

    // Remove snap marker
    this.removeSnapMarker()

    // Show cursor
    this.showCursor()

    // Re-enable camera controls
    this.enableControls()

    // Dispatch update event
    this.dispatchEvent({
      type: 'measurementUpdated',
      measurement: this.editingMeasurement,
    })

    // Reset dragging state
    this.isDragging = false
    this.editingPoint = null
  }

  private cancelEdit(): void {
    // Reset dragging state
    this.isDragging = false
    this.editingPoint = null

    // Re-enable camera controls
    this.enableControls()

    // Show edit sprites
    if (this.startEditSprite) {
      this.startEditSprite.visible = true
    }
    if (this.endEditSprite) {
      this.endEditSprite.visible = true
    }

    // Remove snap marker
    this.removeSnapMarker()

    // Show cursor
    this.showCursor()
  }

  private updateMeasurementPreview(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3
  ): void {
    if (!this.editingMeasurement) return

    const distance = startPos.distanceTo(endPos)

    // Update line geometry
    const positions = [startPos, endPos]
    this.editingMeasurement.line.geometry.setFromPoints(positions)
    this.editingMeasurement.line.geometry.attributes.position.needsUpdate = true

    // Update label position and text
    const midpoint = startPos.clone().add(endPos).multiplyScalar(0.5)
    this.editingMeasurement.label.position.copy(midpoint)
    this.updateLabelText(this.editingMeasurement.label.element, distance)
  }
}
