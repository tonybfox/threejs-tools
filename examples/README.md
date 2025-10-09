# ThreeJS Tools Examples

This folder contains interactive examples demonstrating the functionality of the threejs-tools packages.

## 🚀 Getting Started

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Build the packages:**

   ```bash
   cd ..
   pnpm build
   ```

3. **Start the development server:**

   ```bash
   cd examples
   npx vite
   ```

4. **Open your browser:**
   Visit `http://localhost:3000` to see the examples

## 📁 Examples Overview

### 🔧 Grid Package Example

- **Location:** `/grid/`
- **Features:**
  - Interactive InfiniteGrid component
  - Adjustable grid size and divisions
  - Multiple grid instances
  - Grid positioning and rotation
- **Controls:** Use the control panel to modify grid properties

### 📷 Camera Package Example

- **Location:** `/camera/`
- **Features:**
  - Camera position presets (Front, Side, Top, Isometric)
  - Smooth camera animations
  - Orbit animation mode
  - Perspective vs Orthographic camera switching
  - Real-time camera info display
- **Controls:** Click buttons to change camera views and modes

### 📏 Measurements Package Example

- **Location:** `/measurements/`
- **Features:**
  - Distance measurement tool
  - Angle measurement (3-point)
  - Area calculation tool
  - Grid snap functionality
  - Unit switching (meters/feet)
  - Interactive labels
- **Usage:** Select a tool and click in the 3D scene to measure

### 📦 Asset Loader Package Example

- **Location:** `/asset-loader/`
- **Features:**
  - Universal loader for GLTF, FBX, and OBJ formats
  - Visual placeholder with shader fill effect
  - Real-time progress tracking
  - Asset caching for performance
  - Optional low-res model loading
  - Event-driven architecture
- **Usage:** Use the control panel to create placeholders and see the loading system in action

## 🛠 Development

### Shared Utilities

The `/shared/utils.js` file contains common utilities for:

- Scene setup and configuration
- Object creation helpers
- UI component helpers
- Performance monitoring

### Adding New Examples

1. Create a new folder in `/examples/`
2. Add `index.html` and `main.js` files
3. Update `vite.config.js` to include the new example
4. Update the main `index.html` with a link to your example

### Package Development

When developing the actual packages:

1. Make changes to packages in `/packages/`
2. Run `pnpm build` from the root directory
3. The examples will automatically use the updated packages via workspace linking

## 🎮 Interactive Features

Each example includes:

- **Mouse Controls:** Orbit, zoom, and pan with OrbitControls
- **Responsive Design:** Automatic window resize handling
- **Visual Feedback:** Hover effects and interactive elements
- **Real-time Updates:** Live parameter adjustment
- **Performance Monitoring:** Optional FPS and render statistics

## 🔧 Configuration

### Vite Configuration

The examples use Vite for development with:

- ES modules support
- Hot module replacement
- Multi-page application setup
- Three.js optimization

### Workspace Integration

Examples are configured as a workspace package to:

- Share dependencies with the main packages
- Use workspace linking for package imports
- Maintain consistent tooling across the project

## 📝 Notes

- **Node Version:** Compatible with Node.js 20.18+ (uses Vite 5.x)
- **Browser Support:** Modern browsers with WebGL support
- **Dependencies:** All Three.js packages are peer dependencies
- **Development:** Live reload enabled for all example files

## 🚨 Troubleshooting

### Common Issues

1. **Package not found:** Run `pnpm build` from root directory
2. **Vite not starting:** Check Node.js version compatibility
3. **Import errors:** Ensure packages are built and workspace is properly configured
4. **WebGL errors:** Check browser WebGL support

### Performance Tips

- Use the built-in performance monitor
- Test with different device capabilities
- Monitor memory usage with large scenes
- Use appropriate LOD for complex geometries
