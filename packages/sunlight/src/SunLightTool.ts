import * as THREE from 'three'

export type SunLightWeather = 'sunny' | 'partly-cloudy' | 'overcast'

export interface SunLightToolOptions {
  light?: THREE.DirectionalLight
  ambientLight?: THREE.Light
  latitude?: number
  longitude?: number
  dayOfYear?: number
  timeOfDay?: number
  timeZoneOffsetMinutes?: number
  referenceYear?: number
  useSystemTime?: boolean
  weather?: SunLightWeather
  showHelper?: boolean
  helperSize?: number
  helperColor?: number
  enableHemisphereLight?: boolean
  hemisphereSkyColor?: number
  hemisphereGroundColor?: number
  hemisphereIntensity?: number
  lightDistance?: number
  shadowCameraSize?: number
  shadowCameraFar?: number
  enableMoonLight?: boolean
  minMoonIllumination?: number
  showMoonHelper?: boolean
  moonHelperSize?: number
  moonHelperColor?: number
}

export interface SunLightState {
  date: Date
  latitude: number
  longitude: number
  solarAzimuth: number
  solarAltitude: number
  weather: SunLightWeather
  useSystemTime: boolean
  lunarAzimuth?: number
  lunarAltitude?: number
  moonPhase?: number
  moonIllumination?: number
}

export interface SunLightToolEvents {
  stateChanged: { state: SunLightState }
  weatherChanged: { weather: SunLightWeather }
  systemTimeToggled: { useSystemTime: boolean }
}

interface WeatherPresetConfig {
  sunIntensity: number
  sunColor: THREE.Color
  ambientIntensity: number
  ambientColor: THREE.Color
  hemisphereIntensity: number
  hemisphereSkyColor: THREE.Color
  hemisphereGroundColor: THREE.Color
  shadowBias: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI
const J1970 = 2440588
const J2000 = 2451545

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const normalizeLongitude = (value: number): number => {
  const normalized = ((((value + 180) % 360) + 360) % 360) - 180
  return normalized
}

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

const limitDayOfYear = (day: number, year: number): number => {
  const maxDay = isLeapYear(year) ? 366 : 365
  return clamp(Math.floor(day), 1, maxDay)
}

const normalizeHours = (hours: number): number => {
  const normalized = hours % 24
  return normalized < 0 ? normalized + 24 : normalized
}

const TWILIGHT_SUN_COLOR = new THREE.Color(0xff8c5c)
const TWILIGHT_AMBIENT_COLOR = new THREE.Color(0xffb48a)
const TWILIGHT_SKY_COLOR = new THREE.Color(0xff9966)
const TWILIGHT_GROUND_COLOR = new THREE.Color(0x362a24)
const MOON_COLOR = new THREE.Color(0xb8c5d6)

const toJulian = (date: Date): number => date.valueOf() / DAY_MS - 0.5 + J1970
const toDays = (date: Date): number => toJulian(date) - J2000

const solarMeanAnomaly = (days: number): number =>
  DEG2RAD * (357.5291 + 0.98560028 * days)

const eclipticLongitude = (meanAnomaly: number): number => {
  const c =
    DEG2RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly))
  const p = DEG2RAD * 102.9372
  return meanAnomaly + c + p + Math.PI
}

const declination = (longitude: number): number => {
  const e = DEG2RAD * 23.4397
  return Math.asin(Math.sin(e) * Math.sin(longitude))
}

const rightAscension = (longitude: number): number => {
  const e = DEG2RAD * 23.4397
  return Math.atan2(Math.sin(longitude) * Math.cos(e), Math.cos(longitude))
}

const siderealTime = (days: number, longitudeWest: number): number =>
  DEG2RAD * (280.16 + 360.9856235 * days) - longitudeWest

const solarAzimuth = (
  hourAngle: number,
  latitudeRad: number,
  declinationRad: number
): number =>
  Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitudeRad) -
      Math.tan(declinationRad) * Math.cos(latitudeRad)
  )

const solarAltitude = (
  hourAngle: number,
  latitudeRad: number,
  declinationRad: number
): number =>
  Math.asin(
    Math.sin(latitudeRad) * Math.sin(declinationRad) +
      Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngle)
  )

const computeDayOfYear = (date: Date): number => {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0)
  const diff = date.getTime() - startOfYear
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

// Moon calculation functions
const lunarMeanAnomaly = (days: number): number =>
  DEG2RAD * (134.963 + 13.064993 * days)

const lunarMeanLongitude = (days: number): number =>
  DEG2RAD * (218.316 + 13.176396 * days)

const lunarAscendingNode = (days: number): number =>
  DEG2RAD * (125.044 - 0.052954 * days)

const lunarEclipticLongitude = (
  meanLongitude: number,
  meanAnomaly: number,
  solarMeanAnomaly: number,
  ascendingNode: number
): number => {
  // Simplified calculation with main periodic terms
  const evection =
    DEG2RAD *
    1.274 *
    Math.sin(2 * meanLongitude - 2 * solarMeanAnomaly - meanAnomaly)
  const variation =
    DEG2RAD * 0.658 * Math.sin(2 * meanLongitude - 2 * solarMeanAnomaly)
  const annualEquation = DEG2RAD * 0.186 * Math.sin(solarMeanAnomaly)
  return meanLongitude + evection + variation + annualEquation
}

const lunarEclipticLatitude = (
  lunarLongitude: number,
  ascendingNode: number
): number => {
  return DEG2RAD * 5.128 * Math.sin(lunarLongitude - ascendingNode)
}

const lunarAzimuth = (
  hourAngle: number,
  latitudeRad: number,
  declinationRad: number
): number =>
  Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitudeRad) -
      Math.tan(declinationRad) * Math.cos(latitudeRad)
  )

const lunarAltitude = (
  hourAngle: number,
  latitudeRad: number,
  declinationRad: number
): number =>
  Math.asin(
    Math.sin(latitudeRad) * Math.sin(declinationRad) +
      Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngle)
  )

const moonPhaseAngle = (
  lunarLongitude: number,
  solarLongitude: number
): number => {
  const elongation = lunarLongitude - solarLongitude
  return Math.atan2(Math.sin(elongation), Math.cos(elongation))
}

const moonIllumination = (phaseAngle: number): number => {
  // Illumination fraction: 0 = new moon, 1 = full moon
  return (1 + Math.cos(phaseAngle)) / 2
}

const buildWeatherPreset = (
  weather: SunLightWeather,
  solarAltitude: number
): WeatherPresetConfig => {
  const altitudeFactor = clamp(Math.sin(solarAltitude) + 0.1, 0, 1)
  switch (weather) {
    case 'sunny':
      return {
        sunIntensity: 2.5 * altitudeFactor,
        sunColor: new THREE.Color(0xfff2cf),
        ambientIntensity: 0.25 + 0.45 * altitudeFactor,
        ambientColor: new THREE.Color(0xf5e7cf),
        hemisphereIntensity: 0.4 + 0.4 * altitudeFactor,
        hemisphereSkyColor: new THREE.Color(0xb8d8ff),
        hemisphereGroundColor: new THREE.Color(0xf4d1aa),
        shadowBias: -0.0001,
      }
    case 'partly-cloudy':
      return {
        sunIntensity: 1.1 * altitudeFactor,
        sunColor: new THREE.Color(0xfff6e5),
        ambientIntensity: 0.45 + 0.35 * altitudeFactor,
        ambientColor: new THREE.Color(0xe8ecf1),
        hemisphereIntensity: 0.5 + 0.3 * altitudeFactor,
        hemisphereSkyColor: new THREE.Color(0xc8d7eb),
        hemisphereGroundColor: new THREE.Color(0xe6d9c2),
        shadowBias: -0.0001,
      }
    case 'overcast':
      return {
        sunIntensity: 0.35 * altitudeFactor,
        sunColor: new THREE.Color(0xf0f4ff),
        ambientIntensity: 0.75,
        ambientColor: new THREE.Color(0xd9dde5),
        hemisphereIntensity: 0.8,
        hemisphereSkyColor: new THREE.Color(0xcdd5df),
        hemisphereGroundColor: new THREE.Color(0xc8c8c8),
        shadowBias: -0.0001,
      }
    default:
      return {
        sunIntensity: 1.0 * altitudeFactor,
        sunColor: new THREE.Color(0xffd9b3),
        ambientIntensity: 0.35 + 0.25 * altitudeFactor,
        ambientColor: new THREE.Color(0xffe3c4),
        hemisphereIntensity: 0.4 + 0.3 * altitudeFactor,
        hemisphereSkyColor: new THREE.Color(0xffc8a3),
        hemisphereGroundColor: new THREE.Color(0x5f463a),
        shadowBias: -0.0002,
      }
  }
}

export class SunLightTool extends THREE.EventDispatcher<SunLightToolEvents> {
  private scene: THREE.Scene
  private light: THREE.DirectionalLight
  private ambientLight?: THREE.Light
  private hemisphereLight?: THREE.HemisphereLight
  private helper?: THREE.DirectionalLightHelper
  private moonLight?: THREE.DirectionalLight
  private moonHelper?: THREE.DirectionalLightHelper
  private createdLight: boolean = false
  private createdHemisphere: boolean = false
  private createdMoonLight: boolean = false
  private latitude: number
  private longitude: number
  private dayOfYear: number
  private timeOfDay: number
  private timeZoneOffsetMinutes: number
  private referenceYear: number
  private weather: SunLightWeather
  private useSystemTime: boolean
  private lightDistance: number
  private shadowCameraSize: number
  private shadowCameraFar: number
  private enableMoonLight: boolean
  private minMoonIllumination: number
  private state: SunLightState

  constructor(scene: THREE.Scene, options: SunLightToolOptions = {}) {
    super()
    this.scene = scene
    const defaultLatitude = options.latitude ?? 51.5072
    const defaultLongitude = options.longitude ?? -0.1276
    this.latitude = clamp(defaultLatitude, -90, 90)
    this.longitude = normalizeLongitude(defaultLongitude)
    this.referenceYear = options.referenceYear ?? new Date().getUTCFullYear()
    this.dayOfYear = limitDayOfYear(
      options.dayOfYear ?? 172,
      this.referenceYear
    )
    this.timeOfDay = normalizeHours(options.timeOfDay ?? 12)
    this.timeZoneOffsetMinutes = options.timeZoneOffsetMinutes ?? 0
    this.weather = options.weather ?? 'sunny'
    this.useSystemTime = options.useSystemTime ?? false
    this.lightDistance = options.lightDistance ?? 150
    this.shadowCameraSize = options.shadowCameraSize ?? 100
    this.shadowCameraFar = options.shadowCameraFar ?? 600
    this.enableMoonLight = options.enableMoonLight ?? true
    this.minMoonIllumination = options.minMoonIllumination ?? 0.1

    const existingDirectional = options.light
    this.light =
      existingDirectional ?? new THREE.DirectionalLight(0xffffff, 1.0)
    this.createdLight = !existingDirectional

    if (!this.light.parent) {
      this.scene.add(this.light)
    }

    if (!this.light.target.parent) {
      this.scene.add(this.light.target)
    }

    this.configureShadowMap(this.light)

    if (options.ambientLight) {
      this.ambientLight = options.ambientLight
    }

    if (options.enableHemisphereLight ?? true) {
      this.hemisphereLight = new THREE.HemisphereLight(
        options.hemisphereSkyColor ?? 0xbad4ff,
        options.hemisphereGroundColor ?? 0x74675a,
        options.hemisphereIntensity ?? 0.45
      )
      this.scene.add(this.hemisphereLight)
      this.createdHemisphere = true
    }

    if (this.enableMoonLight) {
      this.moonLight = new THREE.DirectionalLight(MOON_COLOR, 0.0)
      this.scene.add(this.moonLight)
      this.moonLight.target.position.set(0, 0, 0)
      this.scene.add(this.moonLight.target)
      this.configureShadowMap(this.moonLight)
      this.createdMoonLight = true

      if (options.showMoonHelper) {
        this.moonHelper = new THREE.DirectionalLightHelper(
          this.moonLight,
          options.moonHelperSize ?? 20,
          options.moonHelperColor ?? 0xb8c5d6
        )
        this.scene.add(this.moonHelper)
      }
    }

    if (options.showHelper) {
      this.helper = new THREE.DirectionalLightHelper(
        this.light,
        options.helperSize ?? 25,
        options.helperColor ?? 0xffd27f
      )
      this.scene.add(this.helper)
    }

    this.state = {
      date: new Date(),
      latitude: this.latitude,
      longitude: this.longitude,
      solarAzimuth: 0,
      solarAltitude: 0,
      weather: this.weather,
      useSystemTime: this.useSystemTime,
    }

    this.update()
  }

  getLight(): THREE.DirectionalLight {
    return this.light
  }

  getHemisphereLight(): THREE.HemisphereLight | undefined {
    return this.hemisphereLight
  }

  getMoonLight(): THREE.DirectionalLight | undefined {
    return this.moonLight
  }

  getMoonPhase(): number | undefined {
    return this.state.moonPhase
  }

  getMoonIllumination(): number | undefined {
    return this.state.moonIllumination
  }

  getState(): SunLightState {
    return { ...this.state, date: new Date(this.state.date.getTime()) }
  }

  getDayOfYear(): number {
    return this.dayOfYear
  }

  getTimeOfDay(): number {
    return this.timeOfDay
  }

  getTimeZoneOffset(): number {
    return this.timeZoneOffsetMinutes
  }

  getWeather(): SunLightWeather {
    return this.weather
  }

  usesSystemTime(): boolean {
    return this.useSystemTime
  }

  setLatitude(latitude: number): void {
    const clamped = clamp(latitude, -90, 90)
    if (clamped === this.latitude) return
    this.latitude = clamped
    this.update()
  }

  setLongitude(longitude: number): void {
    const normalized = normalizeLongitude(longitude)
    if (normalized === this.longitude) return
    this.longitude = normalized
    this.update()
  }

  setLocation(latitude: number, longitude: number): void {
    let changed = false
    const lat = clamp(latitude, -90, 90)
    if (lat !== this.latitude) {
      this.latitude = lat
      changed = true
    }
    const lon = normalizeLongitude(longitude)
    if (lon !== this.longitude) {
      this.longitude = lon
      changed = true
    }
    if (changed) {
      this.update()
    }
  }

  setDayOfYear(day: number): void {
    const limited = limitDayOfYear(day, this.referenceYear)
    if (limited === this.dayOfYear) return
    this.dayOfYear = limited
    this.update()
  }

  setTimeOfDay(hours: number): void {
    const normalized = normalizeHours(hours)
    if (normalized === this.timeOfDay) return
    this.timeOfDay = normalized
    this.update()
  }

  setTimeZoneOffset(minutes: number): void {
    if (minutes === this.timeZoneOffsetMinutes) return
    this.timeZoneOffsetMinutes = minutes
    this.update()
  }

  setWeather(weather: SunLightWeather): void {
    if (weather === this.weather) return
    this.weather = weather
    this.dispatchEvent({ type: 'weatherChanged', weather })
    this.update()
  }

  setUseSystemTime(enabled: boolean): void {
    if (enabled === this.useSystemTime) return
    this.useSystemTime = enabled
    this.dispatchEvent({
      type: 'systemTimeToggled',
      useSystemTime: this.useSystemTime,
    })
    this.update()
  }

  update(dateOverride?: Date): void {
    const date = this.computeDate(dateOverride)
    const position = this.computeSunPosition(date)
    this.applySunPosition(position, date)

    let moonData:
      | {
          azimuth: number
          altitude: number
          phase: number
          illumination: number
        }
      | undefined

    if (this.enableMoonLight && this.moonLight) {
      moonData = this.computeMoonPosition(date)
      this.applyMoonPosition(moonData)
    }

    this.state = {
      date,
      latitude: this.latitude,
      longitude: this.longitude,
      solarAzimuth: position.azimuth,
      solarAltitude: position.altitude,
      weather: this.weather,
      useSystemTime: this.useSystemTime,
      lunarAzimuth: moonData?.azimuth,
      lunarAltitude: moonData?.altitude,
      moonPhase: moonData?.phase,
      moonIllumination: moonData?.illumination,
    }
    this.applyWeather(position.altitude)
    this.dispatchEvent({ type: 'stateChanged', state: this.getState() })
  }

  dispose(): void {
    if (this.helper) {
      this.scene.remove(this.helper)
      this.helper.dispose()
      this.helper = undefined
    }

    if (this.moonHelper) {
      this.scene.remove(this.moonHelper)
      this.moonHelper.dispose()
      this.moonHelper = undefined
    }

    if (this.createdHemisphere && this.hemisphereLight) {
      this.scene.remove(this.hemisphereLight)
      this.hemisphereLight.dispose()
      this.hemisphereLight = undefined
    }

    if (this.createdMoonLight && this.moonLight) {
      this.scene.remove(this.moonLight)
      if (this.moonLight.shadow?.map) {
        this.moonLight.shadow.map.dispose()
      }
      this.moonLight.dispose()
      this.moonLight = undefined
    }

    if (this.createdLight && this.light) {
      this.scene.remove(this.light)
      if (this.light.shadow?.map) {
        this.light.shadow.map.dispose()
      }
      this.light.dispose()
    }
  }

  private configureShadowMap(light: THREE.DirectionalLight): void {
    light.castShadow = true
    const camera = light.shadow.camera
    if (
      camera instanceof THREE.OrthographicCamera &&
      typeof this.shadowCameraSize === 'number'
    ) {
      const size = this.shadowCameraSize
      camera.left = -size
      camera.right = size
      camera.top = size
      camera.bottom = -size
      camera.near = 0.5
      camera.far = this.shadowCameraFar
      camera.updateProjectionMatrix()
    }
    light.shadow.mapSize.set(2048, 2048)
    light.shadow.bias = -0.0005
  }

  private computeDate(dateOverride?: Date): Date {
    if (dateOverride) {
      return new Date(dateOverride.getTime())
    }

    if (this.useSystemTime) {
      const now = new Date()
      this.referenceYear = now.getUTCFullYear()
      this.dayOfYear = computeDayOfYear(now)
      this.timeOfDay =
        now.getUTCHours() +
        now.getUTCMinutes() / 60 +
        now.getUTCSeconds() / 3600
      return now
    }

    const daysInYear = isLeapYear(this.referenceYear) ? 366 : 365
    const dayIndex = clamp(this.dayOfYear, 1, daysInYear)
    const date = new Date(Date.UTC(this.referenceYear, 0, 1, 0, 0, 0, 0))
    const minutesFromYearStart =
      (dayIndex - 1) * 24 * 60 +
      this.timeOfDay * 60 -
      this.timeZoneOffsetMinutes
    date.setUTCMinutes(minutesFromYearStart)
    return date
  }

  private computeSunPosition(date: Date): {
    azimuth: number
    altitude: number
  } {
    const days = toDays(date)
    const lw = -this.longitude * DEG2RAD
    const phi = this.latitude * DEG2RAD
    const meanAnomaly = solarMeanAnomaly(days)
    const longitude = eclipticLongitude(meanAnomaly)
    const decl = declination(longitude)
    const ra = rightAscension(longitude)
    const sidereal = siderealTime(days, lw)
    const hourAngle = sidereal - ra
    return {
      azimuth: solarAzimuth(hourAngle, phi, decl),
      altitude: solarAltitude(hourAngle, phi, decl),
    }
  }

  private applySunPosition(
    position: { azimuth: number; altitude: number },
    date: Date
  ): void {
    const radius = this.lightDistance
    const altitude = position.altitude
    // Astronomical azimuth: 0° = South, increasing clockwise (East=90°, North=180°, West=270°)
    // Three.js coordinates: +X = East, +Z = North, -X = West, -Z = South
    // The solarAzimuth function returns azimuth measured from South, clockwise
    const azimuth = position.azimuth

    // Correct coordinate mapping for Three.js
    // sin(azimuth) gives us the East-West component, but we need to negate it:
    // azimuth 90° (East) should give +X, azimuth 270° (West) should give -X
    // cos(azimuth) gives us the North-South component, also needs to be positive for correct clockwise motion:
    // azimuth 0° (South) should give -Z, azimuth 180° (North) should give +Z
    const x = -radius * Math.cos(altitude) * Math.sin(azimuth)
    const y = radius * Math.sin(altitude)
    const z = radius * Math.cos(altitude) * Math.cos(azimuth)

    this.light.position.set(x, y, z)
    this.light.target.position.set(0, 0, 0)
    this.light.target.updateMatrixWorld()

    if (this.helper) {
      this.helper.update()
    }

    // Update cached time properties when not using real-time
    if (!this.useSystemTime) {
      this.referenceYear = date.getUTCFullYear()
    }
  }

  private applyWeather(solarAltitude: number): void {
    const preset = buildWeatherPreset(this.weather, solarAltitude)
    const altitudeDeg = solarAltitude * RAD2DEG
    const twilightStartDeg = -6
    const daylightDeg = 4
    const daylightRange = daylightDeg - twilightStartDeg

    const daylightFactor = clamp(
      (altitudeDeg - twilightStartDeg) / daylightRange,
      0,
      1
    )
    const twilightFactor = 1 - daylightFactor

    const sunColor = preset.sunColor.lerp(TWILIGHT_SUN_COLOR, twilightFactor)
    const ambientColor = preset.ambientColor.lerp(
      TWILIGHT_AMBIENT_COLOR,
      twilightFactor
    )
    const skyColor = preset.hemisphereSkyColor.lerp(
      TWILIGHT_SKY_COLOR,
      twilightFactor
    )
    const groundColor = preset.hemisphereGroundColor.lerp(
      TWILIGHT_GROUND_COLOR,
      twilightFactor
    )

    const adjustedSunIntensity = preset.sunIntensity * daylightFactor
    const adjustedAmbientIntensity = Math.max(
      0.05,
      preset.ambientIntensity * (0.3 + 0.7 * daylightFactor)
    )
    const adjustedHemisphereIntensity = Math.max(
      0.05,
      preset.hemisphereIntensity * (0.35 + 0.65 * daylightFactor)
    )

    this.light.intensity = adjustedSunIntensity
    this.light.visible = solarAltitude > 0 && adjustedSunIntensity > 0.001
    this.light.color.copy(sunColor)
    this.light.shadow.bias = preset.shadowBias

    if (this.ambientLight) {
      this.ambientLight.intensity = adjustedAmbientIntensity
      this.ambientLight.color.copy(ambientColor)
    }

    if (this.hemisphereLight) {
      this.hemisphereLight.intensity = adjustedHemisphereIntensity
      this.hemisphereLight.color.copy(skyColor)
      this.hemisphereLight.groundColor.copy(groundColor)
    }
  }

  private computeMoonPosition(date: Date): {
    azimuth: number
    altitude: number
    phase: number
    illumination: number
  } {
    const days = toDays(date)
    const lw = -this.longitude * DEG2RAD
    const phi = this.latitude * DEG2RAD

    // Get solar position for phase calculation
    const solarMeanAnom = solarMeanAnomaly(days)
    const solarLongitude = eclipticLongitude(solarMeanAnom)

    // Moon orbital elements
    const lunarMeanAnom = lunarMeanAnomaly(days)
    const lunarMeanLong = lunarMeanLongitude(days)
    const ascendingNode = lunarAscendingNode(days)

    // Moon ecliptic position
    const lunarLongitude = lunarEclipticLongitude(
      lunarMeanLong,
      lunarMeanAnom,
      solarMeanAnom,
      ascendingNode
    )
    const lunarLatitude = lunarEclipticLatitude(lunarLongitude, ascendingNode)

    // Convert to equatorial coordinates
    const e = DEG2RAD * 23.4397 // Earth's axial tilt
    const decl = Math.asin(
      Math.sin(lunarLatitude) * Math.cos(e) +
        Math.cos(lunarLatitude) * Math.sin(e) * Math.sin(lunarLongitude)
    )
    const ra = Math.atan2(
      Math.sin(lunarLongitude) * Math.cos(e) -
        Math.tan(lunarLatitude) * Math.sin(e),
      Math.cos(lunarLongitude)
    )

    // Calculate hour angle and position
    const sidereal = siderealTime(days, lw)
    const hourAngle = sidereal - ra

    // Calculate phase
    const phase = moonPhaseAngle(lunarLongitude, solarLongitude)
    const illumination = moonIllumination(phase)

    return {
      azimuth: lunarAzimuth(hourAngle, phi, decl),
      altitude: lunarAltitude(hourAngle, phi, decl),
      phase,
      illumination,
    }
  }

  private applyMoonPosition(moonData: {
    azimuth: number
    altitude: number
    phase: number
    illumination: number
  }): void {
    if (!this.moonLight) return

    const radius = this.lightDistance
    const altitude = moonData.altitude
    const azimuth = moonData.azimuth

    // Same coordinate mapping as sun
    const x = -radius * Math.cos(altitude) * Math.sin(azimuth)
    const y = radius * Math.sin(altitude)
    const z = radius * Math.cos(altitude) * Math.cos(azimuth)

    this.moonLight.position.set(x, y, z)
    this.moonLight.target.position.set(0, 0, 0)
    this.moonLight.target.updateMatrixWorld()

    // Moon is visible when above horizon and sufficiently illuminated
    const isVisible =
      altitude > 0 && moonData.illumination >= this.minMoonIllumination

    // Base moonlight intensity (much dimmer than sunlight)
    // Full moon is approximately 400,000 times dimmer than the sun
    const baseMoonIntensity = 0.015
    const weatherFactor =
      this.weather === 'overcast'
        ? 0.3
        : this.weather === 'partly-cloudy'
          ? 0.7
          : 1.0
    const altitudeFactor = Math.max(0, Math.sin(altitude))

    this.moonLight.intensity =
      baseMoonIntensity * moonData.illumination * weatherFactor * altitudeFactor

    this.moonLight.visible = isVisible
    this.moonLight.color.copy(MOON_COLOR)

    if (this.moonHelper) {
      this.moonHelper.update()
      this.moonHelper.visible = isVisible
    }
  }
}
