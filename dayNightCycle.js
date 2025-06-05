import * as THREE from 'three';
import { scene } from './main.js';

// Day/night cycle variables
let isNightMode = true; // Start in night mode
let skybox = null;
let ambientLight = null;
let directionalLight = null;

/**
 * Initialize the lighting system
 */
export function initializeLighting() {
  createSkybox();
  createAmbientLight();
  createDirectionalLight();
  
  console.log(`Lighting setup complete - ${isNightMode ? 'night' : 'day'} scene initialized`);
}

/**
 * Toggle between day and night modes
 */
export function toggleDayNight() {
  isNightMode = !isNightMode;
  
  // Update lighting
  createSkybox();
  createAmbientLight();
  createDirectionalLight();
  
  console.log(`Day/Night toggled: Now in ${isNightMode ? 'night' : 'day'} mode`);
  
  return isNightMode;
}

/**
 * Get current night mode status
 */
export function getIsNightMode() {
  return isNightMode;
}

function createSkybox() {
  // Remove existing skybox if it exists
  if (skybox) {
    scene.remove(skybox);
  }
  
  const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
  
  let skyboxMaterial;
  if (isNightMode) {
    // Night sky
    skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        sunPosition: { value: new THREE.Vector3(0.3, 0.7, 0.2).normalize() },
        skyColor: { value: new THREE.Color(0x0a0a2e) }, // Dark night sky
        horizonColor: { value: new THREE.Color(0x16213e) }, // Very dark blue
        sunColor: { value: new THREE.Color(0x808080) } // Dim moon
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunPosition;
        uniform vec3 skyColor;
        uniform vec3 horizonColor;
        uniform vec3 sunColor;
        varying vec3 vWorldPosition;
        
        void main() {
          vec3 direction = normalize(vWorldPosition);
          
          float heightFactor = direction.y;
          vec3 baseColor = mix(horizonColor, skyColor, smoothstep(-0.1, 0.5, heightFactor));
          
          float sunDistance = distance(direction, sunPosition);
          float sunIntensity = 1.0 - smoothstep(0.0, 0.15, sunDistance);
          float sunGlow = 1.0 - smoothstep(0.0, 0.4, sunDistance);
          
          vec3 finalColor = mix(baseColor, sunColor, sunIntensity * 0.1);
          finalColor = mix(finalColor, sunColor * 0.05, sunGlow * 0.1);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide
    });
  } else {
    // Day sky
    skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        sunPosition: { value: new THREE.Vector3(0.3, 0.7, 0.2).normalize() },
        skyColor: { value: new THREE.Color(0x87CEEB) }, // Sky blue
        horizonColor: { value: new THREE.Color(0xB0E0E6) }, // Powder blue
        sunColor: { value: new THREE.Color(0xFFFFAA) } // Bright sun
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunPosition;
        uniform vec3 skyColor;
        uniform vec3 horizonColor;
        uniform vec3 sunColor;
        varying vec3 vWorldPosition;
        
        void main() {
          vec3 direction = normalize(vWorldPosition);
          
          float heightFactor = direction.y;
          vec3 baseColor = mix(horizonColor, skyColor, smoothstep(-0.1, 0.5, heightFactor));
          
          float sunDistance = distance(direction, sunPosition);
          float sunIntensity = 1.0 - smoothstep(0.0, 0.15, sunDistance);
          float sunGlow = 1.0 - smoothstep(0.0, 0.4, sunDistance);
          
          vec3 finalColor = mix(baseColor, sunColor, sunIntensity * 0.9);
          finalColor = mix(finalColor, sunColor * 0.3, sunGlow * 0.4);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide
    });
  }
  
  skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  scene.add(skybox);
}

function createAmbientLight() {
  // Remove existing ambient light if it exists
  if (ambientLight) {
    scene.remove(ambientLight);
  }
  
  if (isNightMode) {
    // Very low ambient light for night
    ambientLight = new THREE.AmbientLight(0x202040, 0.02);
  } else {
    // Bright ambient light for day
    ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  }
  
  scene.add(ambientLight);
}

function createDirectionalLight() {
  // Remove existing directional light if it exists
  if (directionalLight) {
    scene.remove(directionalLight);
  }
  
  if (!isNightMode) {
    // Only add directional light during day
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(150, 350, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);
  }
}
