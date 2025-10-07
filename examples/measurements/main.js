import * as THREE from 'three';
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js';

// Scene setup using shared utilities
const sceneSetup = new SceneSetup({
  backgroundColor: 0x1a1a1a,
  cameraPosition: [15, 15, 15],
  enableShadows: true,
  enableControls: true,
  antialias: true,
});

// Access scene, camera, renderer, and controls from sceneSetup
const { scene, camera, renderer, controls } = sceneSetup;

// Create grid for reference
const gridHelper = new THREE.GridHelper(20, 20);
gridHelper.material.color.setHex(0x444444);
gridHelper.material.opacity = 0.5;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Create various objects for measurement using ObjectFactory
const objects = [];

// Box
const box = ObjectFactory.createBox([4, 3, 2], 0x3b82f6, [-5, 1.5, -3]);
objects.push(box);
scene.add(box);

// Sphere
const sphere = ObjectFactory.createSphere(2, 0xef4444, [5, 2, 3]);
objects.push(sphere);
scene.add(sphere);

// Cylinder
const cylinder = ObjectFactory.createCylinder(
  1.5,
  1.5,
  5,
  0x10b981,
  [0, 2.5, 6]
);
objects.push(cylinder);
scene.add(cylinder);

// Measurement system (since the measurements package is empty, we'll create our own)
class MeasurementSystem {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.measurements = [];
    this.currentMode = null;
    this.currentPoints = [];
    this.isGridSnap = false;
    this.showLabels = true;
    this.units = 'meters';
    this.measurementGroup = new THREE.Group();
    this.scene.add(this.measurementGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.renderer.domElement.addEventListener('click', (event) => {
      this.onMouseClick(event);
    });
  }

  onMouseClick(event) {
    if (!this.currentMode) return;

    // Calculate mouse position in normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check intersection with objects and ground
    const allIntersectables = [
      ...objects,
      {
        geometry: new THREE.PlaneGeometry(100, 100),
        material: new THREE.MeshBasicMaterial(),
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
      },
    ];

    // Create a ground plane for intersection
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);

    if (intersectPoint) {
      this.addMeasurementPoint(intersectPoint.clone());
    }
  }

  addMeasurementPoint(point) {
    if (this.isGridSnap) {
      point.x = Math.round(point.x);
      point.z = Math.round(point.z);
    }

    this.currentPoints.push(point);

    // Add visual indicator for the point
    const pointGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMesh.position.copy(point);
    this.measurementGroup.add(pointMesh);

    this.processCurrentMeasurement();
  }

  processCurrentMeasurement() {
    switch (this.currentMode) {
      case 'distance':
        if (this.currentPoints.length === 2) {
          this.createDistanceMeasurement();
        }
        break;
      case 'angle':
        if (this.currentPoints.length === 3) {
          this.createAngleMeasurement();
        }
        break;
      case 'area':
        if (this.currentPoints.length >= 3) {
          this.createAreaMeasurement();
        }
        break;
    }
  }

  createDistanceMeasurement() {
    const [point1, point2] = this.currentPoints;
    const distance = point1.distanceTo(point2);

    // Create line
    const geometry = new THREE.BufferGeometry().setFromPoints([point1, point2]);
    const material = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 3,
    });
    const line = new THREE.Line(geometry, material);
    this.measurementGroup.add(line);

    // Create label
    if (this.showLabels) {
      const midPoint = point1.clone().add(point2).multiplyScalar(0.5);
      midPoint.y += 0.5;
      this.createLabel(midPoint, `${distance.toFixed(2)} ${this.units}`);
    }

    const measurement = {
      type: 'distance',
      points: [...this.currentPoints],
      value: distance,
      objects: [line],
    };

    this.measurements.push(measurement);
    this.currentPoints = [];
    this.updateMeasurementsList();
    this.hideInstruction();
  }

  createAngleMeasurement() {
    const [point1, point2, point3] = this.currentPoints;

    // Create vectors
    const vector1 = point1.clone().sub(point2).normalize();
    const vector2 = point3.clone().sub(point2).normalize();

    // Calculate angle
    const angle = vector1.angleTo(vector2) * (180 / Math.PI);

    // Create angle arc visualization
    const arcGeometry = new THREE.RingGeometry(0.5, 0.7, 0, 32);
    const arcMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const arc = new THREE.Mesh(arcGeometry, arcMaterial);
    arc.position.copy(point2);
    arc.lookAt(point2.clone().add(new THREE.Vector3(0, 1, 0)));
    this.measurementGroup.add(arc);

    // Create lines to show the angle
    const line1Geometry = new THREE.BufferGeometry().setFromPoints([
      point2,
      point1,
    ]);
    const line2Geometry = new THREE.BufferGeometry().setFromPoints([
      point2,
      point3,
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 2,
    });

    const line1 = new THREE.Line(line1Geometry, lineMaterial);
    const line2 = new THREE.Line(line2Geometry, lineMaterial);
    this.measurementGroup.add(line1);
    this.measurementGroup.add(line2);

    if (this.showLabels) {
      const labelPos = point2.clone();
      labelPos.y += 1;
      this.createLabel(labelPos, `${angle.toFixed(1)}°`);
    }

    const measurement = {
      type: 'angle',
      points: [...this.currentPoints],
      value: angle,
      objects: [arc, line1, line2],
    };

    this.measurements.push(measurement);
    this.currentPoints = [];
    this.updateMeasurementsList();
    this.hideInstruction();
  }

  createAreaMeasurement() {
    if (this.currentPoints.length < 3) return;

    // Calculate area using shoelace formula (for ground plane)
    let area = 0;
    const points = this.currentPoints;

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].z;
      area -= points[j].x * points[i].z;
    }
    area = Math.abs(area) / 2;

    // Create polygon visualization
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].z);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].z);
    }

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const polygon = new THREE.Mesh(geometry, material);
    polygon.rotation.x = -Math.PI / 2;
    polygon.position.y = 0.01;
    this.measurementGroup.add(polygon);

    // Create outline
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints([
      ...points,
      points[0],
    ]);
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 3,
    });
    const outline = new THREE.Line(outlineGeometry, outlineMaterial);
    this.measurementGroup.add(outline);

    if (this.showLabels) {
      // Calculate centroid for label placement
      const centroid = new THREE.Vector3();
      points.forEach((point) => centroid.add(point));
      centroid.divideScalar(points.length);
      centroid.y += 0.5;

      const units = this.units === 'meters' ? 'm²' : 'ft²';
      this.createLabel(centroid, `${area.toFixed(2)} ${units}`);
    }

    const measurement = {
      type: 'area',
      points: [...this.currentPoints],
      value: area,
      objects: [polygon, outline],
    };

    this.measurements.push(measurement);
    this.currentPoints = [];
    this.updateMeasurementsList();
    this.hideInstruction();
  }

  createLabel(position, text) {
    // Create a simple text sprite (using canvas)
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 60;

    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#f59e0b';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 5);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(2, 1, 1);

    this.measurementGroup.add(sprite);
    return sprite;
  }

  setMode(mode) {
    this.currentMode = mode;
    this.currentPoints = [];
    this.updateInstruction();
  }

  updateInstruction() {
    if (!this.currentMode) {
      instructionText.textContent =
        'Select a measurement tool to start measuring objects in the scene';
      instructionPanel.style.display = 'block';
      return;
    }

    let text = '';
    switch (this.currentMode) {
      case 'distance':
        text = `Distance Mode: Click two points to measure distance (${this.currentPoints.length}/2)`;
        break;
      case 'angle':
        text = `Angle Mode: Click three points to measure angle (${this.currentPoints.length}/3)`;
        break;
      case 'area':
        text = `Area Mode: Click points to define area, min 3 points (${this.currentPoints.length}/3+)`;
        break;
    }
    instructionText.textContent = text;
    instructionPanel.style.display = 'block';
  }

  hideInstruction() {
    setTimeout(() => {
      instructionPanel.style.display = 'none';
    }, 2000);
  }

  clearMeasurements() {
    this.measurements.forEach((measurement) => {
      measurement.objects.forEach((obj) => {
        this.measurementGroup.remove(obj);
      });
    });

    // Clear all children from measurement group
    while (this.measurementGroup.children.length > 0) {
      this.measurementGroup.remove(this.measurementGroup.children[0]);
    }

    this.measurements = [];
    this.currentPoints = [];
    this.updateMeasurementsList();
  }

  toggleUnits() {
    this.units = this.units === 'meters' ? 'feet' : 'meters';
    // Re-create measurements with new units
    this.updateMeasurementsList();
  }

  updateMeasurementsList() {
    if (this.measurements.length === 0) {
      measurementsListDiv.textContent =
        'No measurements yet. Click to start measuring!';
      return;
    }

    let html = '';
    this.measurements.forEach((measurement, index) => {
      const value =
        this.units === 'feet' ? measurement.value * 3.28084 : measurement.value;
      const unit =
        measurement.type === 'area'
          ? this.units === 'meters'
            ? 'm²'
            : 'ft²'
          : measurement.type === 'angle'
          ? '°'
          : this.units;

      html += `<div>${index + 1}. ${measurement.type}: ${value.toFixed(
        2
      )} ${unit}</div>`;
    });
    measurementsListDiv.innerHTML = html;
  }
}

// Initialize measurement system
const measurementSystem = new MeasurementSystem(scene, camera, renderer);

// Create UI using shared utilities
const controlPanel = UIHelpers.createControlPanel('📏 Measurement Tools');

// Measurement Mode buttons
let activeModeButton = null;
const distanceBtn = UIHelpers.createButton(
  'Distance Tool',
  () => {
    measurementSystem.setMode('distance');
    updateActiveButton(distanceBtn);
  },
  'warning'
);
controlPanel.appendChild(distanceBtn);

const angleBtn = UIHelpers.createButton(
  'Angle Tool',
  () => {
    measurementSystem.setMode('angle');
    updateActiveButton(angleBtn);
  },
  'warning'
);
controlPanel.appendChild(angleBtn);

const areaBtn = UIHelpers.createButton(
  'Area Tool',
  () => {
    measurementSystem.setMode('area');
    updateActiveButton(areaBtn);
  },
  'warning'
);
controlPanel.appendChild(areaBtn);

// Action buttons
const clearBtn = UIHelpers.createButton(
  'Clear All',
  () => {
    measurementSystem.clearMeasurements();
  },
  'secondary'
);
controlPanel.appendChild(clearBtn);

const unitsBtn = UIHelpers.createButton(
  'Units: Meters',
  () => {
    measurementSystem.toggleUnits();
    unitsBtn.textContent = `Units: ${
      measurementSystem.units === 'meters' ? 'Meters' : 'Feet'
    }`;
  },
  'secondary'
);
controlPanel.appendChild(unitsBtn);

// Measurement Options buttons
const snapBtn = UIHelpers.createButton(
  'Grid Snap: OFF',
  () => {
    measurementSystem.isGridSnap = !measurementSystem.isGridSnap;
    snapBtn.textContent = `Grid Snap: ${
      measurementSystem.isGridSnap ? 'ON' : 'OFF'
    }`;
    snapBtn.style.background = measurementSystem.isGridSnap
      ? '#10b981'
      : '#374151';
  },
  'secondary'
);
controlPanel.appendChild(snapBtn);

const labelsBtn = UIHelpers.createButton(
  'Labels: ON',
  () => {
    measurementSystem.showLabels = !measurementSystem.showLabels;
    labelsBtn.textContent = `Labels: ${
      measurementSystem.showLabels ? 'ON' : 'OFF'
    }`;
    labelsBtn.style.background = measurementSystem.showLabels
      ? '#10b981'
      : '#374151';
  },
  'secondary'
);
labelsBtn.style.background = '#10b981'; // Start with ON style
controlPanel.appendChild(labelsBtn);

// Create measurements info panel
const measurementsPanel = UIHelpers.createControlPanel(
  '📊 Measurements',
  'bottom-right'
);
measurementsPanel.style.fontFamily = 'monospace';
measurementsPanel.style.fontSize = '12px';
measurementsPanel.style.maxWidth = '300px';

const measurementsListDiv = document.createElement('div');
measurementsListDiv.textContent =
  'No measurements yet. Click to start measuring!';
measurementsPanel.appendChild(measurementsListDiv);

// Create instruction panel
const instructionPanel = UIHelpers.createControlPanel(
  'ℹ️ Instructions',
  'top-right'
);
instructionPanel.style.textAlign = 'center';
instructionPanel.style.color = '#f59e0b';
instructionPanel.style.fontSize = '14px';
instructionPanel.style.display = 'block';

const instructionText = document.createElement('div');
instructionText.textContent =
  'Select a measurement tool to start measuring objects in the scene';
instructionPanel.appendChild(instructionText);

function updateActiveButton(activeButton) {
  // Reset all measurement buttons
  [distanceBtn, angleBtn, areaBtn].forEach((btn) => {
    btn.style.background = '#f59e0b';
  });
  // Set active button style
  activeButton.style.background = '#dc2626';
  activeModeButton = activeButton;
}

// Custom animation function
function customAnimation() {
  // Rotate objects for visual interest
  objects.forEach((obj, index) => {
    obj.rotation.y += 0.005 * (index + 1);
  });
}

// Start animation using shared scene setup
sceneSetup.start(customAnimation);

console.log('Measurements Example loaded! 📏');
console.log('- Select a measurement tool and click in the scene to measure');
console.log('- Try measuring distances between objects');
console.log('- Create angle measurements with three points');
console.log('- Define areas by clicking multiple points');
console.log('- Use grid snap and toggle units for precision');
