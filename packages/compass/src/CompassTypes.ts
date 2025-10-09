import * as THREE from 'three'

export interface CompassToolOptions {
  latitude?: number
  longitude?: number
  position?: THREE.Vector3 | [number, number, number]
  arrowLength?: number
  shaftRadius?: number
  headLengthRatio?: number
  headRadiusMultiplier?: number
  baseRadius?: number
  baseHeight?: number
  arrowColor?: number
  baseColor?: number
  accentColor?: number
  ringColor?: number
  ringInnerRadius?: number
  ringOuterRadius?: number
  showRing?: boolean
  headingOffsetDegrees?: number
  worldNorth?: THREE.Vector3 | [number, number, number]
  worldUp?: THREE.Vector3 | [number, number, number]
  autoAddToScene?: boolean
  getNorthDirection?: (
    latitude: number,
    longitude: number
  ) => THREE.Vector3 | [number, number, number]
}

export interface CompassState {
  latitude: number
  longitude: number
  position: THREE.Vector3
  headingDegrees: number
  direction: THREE.Vector3
}

export interface CompassToolEventMap {
  locationChanged: { latitude: number; longitude: number }
  positionChanged: { position: THREE.Vector3 }
  headingChanged: {
    direction: THREE.Vector3
    headingDegrees: number
    latitude: number
    longitude: number
  }
  visibilityChanged: { visible: boolean }
}
