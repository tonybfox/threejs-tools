import * as THREE from 'three'
import {
  CompassState,
  CompassToolEventMap,
  CompassToolOptions,
} from './CompassTypes'

const DEFAULT_WORLD_UP = new THREE.Vector3(0, 1, 0)
const DEFAULT_WORLD_NORTH = new THREE.Vector3(0, 0, 1)
const FORWARD_REFERENCE = new THREE.Vector3(0, 0, 1)

const toVector3 = (
  input: THREE.Vector3 | [number, number, number] | undefined,
  fallback: THREE.Vector3
): THREE.Vector3 => {
  if (!input) {
    return fallback.clone()
  }

  if (Array.isArray(input)) {
    const [x = 0, y = 0, z = 0] = input
    return new THREE.Vector3(x, y, z)
  }

  return input.clone()
}

const normalizeHeadingDegrees = (degrees: number): number => {
  const normalized = degrees % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export class CompassTool extends THREE.EventDispatcher<CompassToolEventMap> {
  private scene: THREE.Scene
  private group: THREE.Group
  private arrowGroup: THREE.Group
  private indicatorGroup: THREE.Group
  private baseMesh: THREE.Mesh<
    THREE.CylinderGeometry,
    THREE.MeshStandardMaterial
  >
  private arrowMeshes: THREE.Mesh[] = []
  private ringMesh: THREE.Mesh<
    THREE.RingGeometry,
    THREE.MeshBasicMaterial
  > | null = null
  private indicatorMesh: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshStandardMaterial
  >

  private geometryDisposables: THREE.BufferGeometry[] = []
  private materialDisposables: THREE.Material[] = []

  private latitude: number
  private longitude: number
  private position: THREE.Vector3
  private headingDegrees: number = 0

  private worldUp: THREE.Vector3
  private worldNorth: THREE.Vector3
  private referenceNorth: THREE.Vector3
  private northResolver: (
    latitude: number,
    longitude: number,
    target: THREE.Vector3
  ) => THREE.Vector3
  private declinationRad: number
  private autoAddToScene: boolean

  private currentDirection: THREE.Vector3 = new THREE.Vector3()
  private tmpVectorA: THREE.Vector3 = new THREE.Vector3()
  private tmpVectorB: THREE.Vector3 = new THREE.Vector3()
  private tmpVectorC: THREE.Vector3 = new THREE.Vector3()
  private tmpQuaternion: THREE.Quaternion = new THREE.Quaternion()

  private disposed = false

  constructor(scene: THREE.Scene, options: CompassToolOptions = {}) {
    super()

    this.scene = scene
    this.autoAddToScene = options.autoAddToScene ?? true

    // Normalize world orientation vectors
    this.worldUp = toVector3(options.worldUp, DEFAULT_WORLD_UP).normalize()

    this.worldNorth = toVector3(options.worldNorth, DEFAULT_WORLD_NORTH)
      .projectOnPlane(this.worldUp)
      .normalize()

    if (this.worldNorth.lengthSq() === 0) {
      // Fallback to an orthogonal vector if supplied north is colinear with up
      const fallback =
        Math.abs(this.worldUp.y) < 0.99
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(1, 0, 0)
      this.worldNorth = fallback.projectOnPlane(this.worldUp).normalize()
    }

    this.referenceNorth = this.worldNorth.clone()

    this.latitude = THREE.MathUtils.clamp(options.latitude ?? 0, -90, 90)
    this.longitude =
      THREE.MathUtils.euclideanModulo(options.longitude ?? 0 + 180, 360) - 180

    this.position = toVector3(options.position, new THREE.Vector3())

    this.declinationRad = THREE.MathUtils.degToRad(
      options.headingOffsetDegrees ?? 0
    )

    const northFunction = options.getNorthDirection

    this.northResolver =
      northFunction != null
        ? (lat, lon, target) => {
            const result = northFunction(lat, lon)
            if (!result) {
              return target.copy(this.worldNorth)
            }
            if (Array.isArray(result)) {
              const [x = 0, y = 0, z = 0] = result
              return target.set(x, y, z)
            }
            return target.copy(result)
          }
        : (_lat, _lon, target) => target.copy(this.worldNorth)

    this.group = new THREE.Group()
    this.group.name = 'CompassTool'
    this.group.position.copy(this.position)

    const arrowLength = options.arrowLength ?? 4
    const headLengthRatio = THREE.MathUtils.clamp(
      options.headLengthRatio ?? 0.35,
      0.1,
      0.8
    )
    const shaftLength = arrowLength * (1 - headLengthRatio)
    const headLength = arrowLength * headLengthRatio
    const shaftRadius =
      options.shaftRadius ?? Math.max(arrowLength * 0.05, 0.05)
    const headRadius = shaftRadius * (options.headRadiusMultiplier ?? 2.4)

    const baseRadius = options.baseRadius ?? arrowLength * 0.45
    const baseHeight = options.baseHeight ?? Math.max(arrowLength * 0.09, 0.12)

    const arrowColor = options.arrowColor ?? 0xff3b30
    const baseColor = options.baseColor ?? 0x19212e
    const accentColor = options.accentColor ?? 0xffffff
    const ringColor = options.ringColor ?? 0x3d4a63
    const showRing = options.showRing ?? true
    const ringInnerRadius = options.ringInnerRadius ?? baseRadius * 0.82
    const ringOuterRadius = options.ringOuterRadius ?? baseRadius * 0.95

    // Base
    const baseGeometry = new THREE.CylinderGeometry(
      baseRadius,
      baseRadius,
      baseHeight,
      48,
      1,
      false
    )
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.35,
      roughness: 0.8,
    })

    this.baseMesh = new THREE.Mesh(baseGeometry, baseMaterial)
    this.baseMesh.castShadow = false
    this.baseMesh.receiveShadow = true
    this.baseMesh.position.y = baseHeight / 2
    this.group.add(this.baseMesh)

    this.geometryDisposables.push(baseGeometry)
    this.materialDisposables.push(baseMaterial)

    // Subtle accent ring on top of the base
    const accentGeometry = new THREE.CylinderGeometry(
      baseRadius * 0.92,
      baseRadius * 0.92,
      Math.max(baseHeight * 0.08, 0.04),
      48,
      1,
      false
    )
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.6,
      roughness: 0.35,
      transparent: true,
      opacity: 0.35,
    })
    const accentMesh = new THREE.Mesh(accentGeometry, accentMaterial)
    accentMesh.position.y = baseHeight * 0.95
    accentMesh.receiveShadow = false
    accentMesh.castShadow = false
    this.group.add(accentMesh)

    this.geometryDisposables.push(accentGeometry)
    this.materialDisposables.push(accentMaterial)

    // Arrow setup (forward = +Z)
    this.arrowGroup = new THREE.Group()
    this.arrowGroup.position.y = baseHeight
    this.group.add(this.arrowGroup)

    const arrowMaterial = new THREE.MeshStandardMaterial({
      color: arrowColor,
      metalness: 0.25,
      roughness: 0.35,
    })

    const shaftGeometry = new THREE.CylinderGeometry(
      shaftRadius,
      shaftRadius,
      shaftLength,
      24,
      1,
      true
    )
    shaftGeometry.rotateX(Math.PI / 2)
    const shaftMesh = new THREE.Mesh(shaftGeometry, arrowMaterial)
    shaftMesh.position.z = shaftLength / 2
    shaftMesh.castShadow = true
    shaftMesh.receiveShadow = false
    this.arrowGroup.add(shaftMesh)
    this.arrowMeshes.push(shaftMesh)

    const headGeometry = new THREE.ConeGeometry(headRadius, headLength, 36, 1)
    headGeometry.rotateX(Math.PI / 2)
    const headMesh = new THREE.Mesh(headGeometry, arrowMaterial)
    headMesh.position.z = shaftLength + headLength / 2
    headMesh.castShadow = true
    headMesh.receiveShadow = false
    this.arrowGroup.add(headMesh)
    this.arrowMeshes.push(headMesh)

    this.geometryDisposables.push(shaftGeometry, headGeometry)
    this.materialDisposables.push(arrowMaterial)

    // Add a small south marker for visual balance
    const tailGeometry = new THREE.ConeGeometry(
      headRadius * 0.4,
      headLength * 0.45,
      24,
      1
    )
    tailGeometry.rotateX(-Math.PI / 2)
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.25,
      roughness: 0.6,
    })
    const tailMesh = new THREE.Mesh(tailGeometry, tailMaterial)
    tailMesh.position.z = -headLength * 0.25
    tailMesh.castShadow = false
    tailMesh.receiveShadow = false
    // this.arrowGroup.add(tailMesh)
    this.arrowMeshes.push(tailMesh)
    this.geometryDisposables.push(tailGeometry)
    this.materialDisposables.push(tailMaterial)

    if (showRing) {
      const ringGeometry = new THREE.RingGeometry(
        ringInnerRadius,
        ringOuterRadius,
        64
      )
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
      this.ringMesh = new THREE.Mesh(ringGeometry, ringMaterial)
      this.ringMesh.rotation.x = -Math.PI / 2
      this.ringMesh.position.y = baseHeight + 0.001
      this.group.add(this.ringMesh)
      this.geometryDisposables.push(ringGeometry)
      this.materialDisposables.push(ringMaterial)
    }

    // Heading indicator that orbits with the arrow direction
    this.indicatorGroup = new THREE.Group()
    this.indicatorGroup.position.y =
      baseHeight + Math.max(baseHeight * 0.12, 0.05)
    this.group.add(this.indicatorGroup)

    const indicatorGeometry = new THREE.BoxGeometry(
      Math.max(baseRadius * 0.18, 0.12),
      Math.max(baseHeight * 0.18, 0.08),
      Math.max(baseRadius * 0.08, 0.04)
    )
    const indicatorMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.55,
      roughness: 0.3,
      emissive: new THREE.Color(accentColor).multiplyScalar(0.15),
    })
    this.indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial)
    const indicatorRadius = ringOuterRadius * 0.96
    this.indicatorMesh.position.set(0, 0, indicatorRadius)
    this.indicatorMesh.castShadow = false
    this.indicatorMesh.receiveShadow = false
    this.indicatorGroup.add(this.indicatorMesh)

    this.geometryDisposables.push(indicatorGeometry)
    this.materialDisposables.push(indicatorMaterial)

    if (this.autoAddToScene) {
      this.scene.add(this.group)
    }

    this.updateOrientation(false)
  }

  /**
   * Returns the primary Object3D for external use.
   */
  getObject3D(): THREE.Group {
    return this.group
  }

  /**
   * Updates the compass world position.
   */
  setPosition(position: THREE.Vector3 | [number, number, number]): void {
    if (this.disposed) return

    const next = toVector3(position, this.position)
    if (next.equals(this.position)) {
      return
    }

    this.position.copy(next)
    this.group.position.copy(this.position)

    this.dispatchEvent({
      type: 'positionChanged',
      position: this.position.clone(),
    })
  }

  /**
   * Returns the current world position.
   */
  getPosition(): THREE.Vector3 {
    return this.position.clone()
  }

  /**
   * Updates the latitude and longitude together.
   */
  setLocation(latitude: number, longitude: number): void {
    if (this.disposed) return

    const lat = THREE.MathUtils.clamp(latitude, -90, 90)
    const lon = THREE.MathUtils.euclideanModulo(longitude + 180, 360) - 180

    const changed = lat !== this.latitude || lon !== this.longitude
    if (!changed) {
      return
    }

    this.latitude = lat
    this.longitude = lon

    this.updateOrientation()
    this.dispatchEvent({
      type: 'locationChanged',
      latitude: this.latitude,
      longitude: this.longitude,
    })
  }

  setLatitude(latitude: number): void {
    this.setLocation(latitude, this.longitude)
  }

  getLatitude(): number {
    return this.latitude
  }

  setLongitude(longitude: number): void {
    this.setLocation(this.latitude, longitude)
  }

  getLongitude(): number {
    return this.longitude
  }

  /**
   * Optionally supply a new north resolver at runtime.
   */
  setNorthResolver(
    resolver: (
      latitude: number,
      longitude: number
    ) => THREE.Vector3 | [number, number, number]
  ): void {
    if (this.disposed) return

    this.northResolver = (lat, lon, target) => {
      const result = resolver(lat, lon)
      if (!result) {
        return target.copy(this.worldNorth)
      }
      if (Array.isArray(result)) {
        const [x = 0, y = 0, z = 0] = result
        return target.set(x, y, z)
      }
      return target.copy(result)
    }

    this.updateOrientation()
  }

  /**
   * Adjust heading offset (e.g., magnetic declination) in degrees.
   */
  setHeadingOffsetDegrees(degrees: number): void {
    if (this.disposed) return

    const radians = THREE.MathUtils.degToRad(degrees)
    if (Math.abs(radians - this.declinationRad) < 1e-6) {
      return
    }

    this.declinationRad = radians
    this.updateOrientation()
  }

  getHeadingDegrees(): number {
    return this.headingDegrees
  }

  getDirection(): THREE.Vector3 {
    return this.currentDirection.clone()
  }

  getState(): CompassState {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      position: this.getPosition(),
      headingDegrees: this.headingDegrees,
      direction: this.getDirection(),
    }
  }

  setVisible(visible: boolean): void {
    if (this.disposed) return
    if (this.group.visible === visible) {
      return
    }
    this.group.visible = visible
    this.dispatchEvent({ type: 'visibilityChanged', visible })
  }

  isVisible(): boolean {
    return this.group.visible
  }

  /**
   * Removes meshes and materials and detaches from the scene.
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    if (this.group.parent) {
      this.group.parent.remove(this.group)
    }

    this.arrowMeshes.length = 0
    this.geometryDisposables.forEach((geometry) => geometry.dispose())
    this.materialDisposables.forEach((material) => material.dispose())
    this.geometryDisposables.length = 0
    this.materialDisposables.length = 0

    this.disposed = true
  }

  private resolveNorthVector(target: THREE.Vector3): THREE.Vector3 {
    const vector = this.northResolver(this.latitude, this.longitude, target)

    if (vector.lengthSq() === 0) {
      vector.copy(this.referenceNorth)
    }

    vector.normalize()
    vector.projectOnPlane(this.worldUp)

    if (vector.lengthSq() === 0) {
      vector.copy(this.referenceNorth)
    }

    vector.normalize()

    if (this.declinationRad !== 0) {
      vector.applyAxisAngle(this.worldUp, this.declinationRad)
    }

    return vector.normalize()
  }

  private updateOrientation(dispatchEvent: boolean = true): void {
    const direction = this.resolveNorthVector(this.tmpVectorA)
    this.currentDirection.copy(direction)

    this.arrowGroup.quaternion.copy(
      this.tmpQuaternion.setFromUnitVectors(FORWARD_REFERENCE, direction)
    )

    this.indicatorGroup.quaternion.copy(this.arrowGroup.quaternion)

    this.headingDegrees = this.computeHeadingDegrees(direction)

    if (dispatchEvent) {
      this.dispatchEvent({
        type: 'headingChanged',
        direction: direction.clone(),
        headingDegrees: this.headingDegrees,
        latitude: this.latitude,
        longitude: this.longitude,
      })
    }
  }

  private computeHeadingDegrees(direction: THREE.Vector3): number {
    const planarDirection = this.tmpVectorB
      .copy(direction)
      .projectOnPlane(this.worldUp)

    if (planarDirection.lengthSq() === 0) {
      return 0
    }

    planarDirection.normalize()

    const reference = this.tmpVectorC.copy(this.referenceNorth)
    const dot = THREE.MathUtils.clamp(reference.dot(planarDirection), -1, 1)
    let angle = Math.acos(dot)

    const cross = reference.cross(planarDirection)
    if (cross.dot(this.worldUp) < 0) {
      angle = -angle
    }

    return normalizeHeadingDegrees(THREE.MathUtils.radToDeg(angle))
  }
}
