import * as THREE from 'three';
import { scene } from './main.js';

// Day/night cycle variables
let isNightMode = true; // Start in night mode
let skybox = null;
let ambientLight = null;
let directionalLight = null;

// Transition variables
let isTransitioning = false;
let transitionProgress = 0; // 0 = day, 1 = night
let transitionSpeed = 0.02; // How fast the transition happens
let targetNightMode = true;

// Color definitions for smooth interpolation
const dayColors = {
  skyColor: new THREE.Color(0x87CEEB), // Sky blue
  horizonColor: new THREE.Color(0xB0E0E6), // Powder blue
  sunColor: new THREE.Color(0xFFFFAA), // Bright sun
  ambientColor: new THREE.Color(0x404040),
  ambientIntensity: 0.6
};

const nightColors = {
  skyColor: new THREE.Color(0x0a0a2e), // Dark night sky
  horizonColor: new THREE.Color(0x16213e), // Very dark blue
  sunColor: new THREE.Color(0x808080), // Dim moon
  ambientColor: new THREE.Color(0x202040),
  ambientIntensity: 0.005 // Reduced from 0.02 to make cylinder lights more prominent
};

/**
 * Initialize the lighting system
 */
export function initializeLighting() {
  transitionProgress = isNightMode ? 1 : 0;
  createSkybox();
  createAmbientLight();
  createDirectionalLight();
  
  console.log(`Lighting setup complete - ${isNightMode ? 'night' : 'day'} scene initialized`);
}

/**
 * Toggle between day and night modes with smooth transition
 */
export function toggleDayNight() {
  if (isTransitioning) {
    return isNightMode; // Don't allow toggle during transition
  }
  
  targetNightMode = !isNightMode;
  isTransitioning = true;
  
  console.log(`Starting transition to ${targetNightMode ? 'night' : 'day'} mode`);
  
  // Start the transition animation
  animateTransition();
  
  return targetNightMode;
}

/**
 * Get current night mode status
 */
export function getIsNightMode() {
  return isNightMode;
}

/**
 * Get transition progress (for external use)
 */
export function getTransitionProgress() {
  return transitionProgress;
}

/**
 * Animate the smooth transition between day and night
 */
function animateTransition() {
  if (!isTransitioning) return;
  
  // Update transition progress
  if (targetNightMode) {
    transitionProgress = Math.min(1, transitionProgress + transitionSpeed);
  } else {
    transitionProgress = Math.max(0, transitionProgress - transitionSpeed);
  }
  
  // Update lighting based on current progress
  updateLightingForTransition();
  
  // Update fog if available
  if (window.updateFogForDayNight) {
    window.updateFogForDayNight();
  }
  
  // Check if transition is complete
  if ((targetNightMode && transitionProgress >= 1) || (!targetNightMode && transitionProgress <= 0)) {
    isNightMode = targetNightMode;
    isTransitioning = false;
    transitionProgress = isNightMode ? 1 : 0;
    console.log(`Transition complete: Now in ${isNightMode ? 'night' : 'day'} mode`);
  } else {
    // Continue animation
    requestAnimationFrame(animateTransition);
  }
}

/**
 * Update lighting based on transition progress
 */
function updateLightingForTransition() {
  updateSkyboxForTransition();
  updateAmbientLightForTransition();
  updateDirectionalLightForTransition();
  
  // Update skybox transition progress uniform
  if (skybox && skybox.material.uniforms) {
    skybox.material.uniforms.transitionProgress.value = transitionProgress;
  }
}

function updateSkyboxForTransition() {
  if (!skybox || !skybox.material.uniforms) return;
  
  const uniforms = skybox.material.uniforms;
  
  // Interpolate colors
  const currentSkyColor = new THREE.Color().lerpColors(dayColors.skyColor, nightColors.skyColor, transitionProgress);
  const currentHorizonColor = new THREE.Color().lerpColors(dayColors.horizonColor, nightColors.horizonColor, transitionProgress);
  const currentSunColor = new THREE.Color().lerpColors(dayColors.sunColor, nightColors.sunColor, transitionProgress);
  
  uniforms.skyColor.value.copy(currentSkyColor);
  uniforms.horizonColor.value.copy(currentHorizonColor);
  uniforms.sunColor.value.copy(currentSunColor);
}

function updateAmbientLightForTransition() {
  if (!ambientLight) return;
  
  // Interpolate ambient light color and intensity
  const currentColor = new THREE.Color().lerpColors(dayColors.ambientColor, nightColors.ambientColor, transitionProgress);
  const currentIntensity = THREE.MathUtils.lerp(dayColors.ambientIntensity, nightColors.ambientIntensity, transitionProgress);
  
  ambientLight.color.copy(currentColor);
  ambientLight.intensity = currentIntensity;
}

function updateDirectionalLightForTransition() {
  if (!directionalLight) {
    // Create directional light if it doesn't exist and we're transitioning to day
    if (transitionProgress < 0.5) {
      createDirectionalLight();
    }
    return;
  }
  
  // Fade out directional light as we transition to night
  const dayIntensity = 1.0;
  const nightIntensity = 0.0;
  const currentIntensity = THREE.MathUtils.lerp(dayIntensity, nightIntensity, transitionProgress);
  
  directionalLight.intensity = currentIntensity;
  
  // Remove directional light completely when fully night
  if (transitionProgress >= 1 && directionalLight) {
    scene.remove(directionalLight);
    directionalLight = null;
  }
}

function createSkybox() {
  // Remove existing skybox if it exists
  if (skybox) {
    scene.remove(skybox);
  }
  
  const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
  
  // Create shader material that will be updated during transitions
  const skyboxMaterial = new THREE.ShaderMaterial({
    uniforms: {
      sunPosition: { value: new THREE.Vector3(0.3, 0.7, 0.2).normalize() },
      skyColor: { value: new THREE.Color().lerpColors(dayColors.skyColor, nightColors.skyColor, transitionProgress) },
      horizonColor: { value: new THREE.Color().lerpColors(dayColors.horizonColor, nightColors.horizonColor, transitionProgress) },
      sunColor: { value: new THREE.Color().lerpColors(dayColors.sunColor, nightColors.sunColor, transitionProgress) },
      transitionProgress: { value: transitionProgress }
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
      uniform float transitionProgress;
      varying vec3 vWorldPosition;
      
      void main() {
        vec3 direction = normalize(vWorldPosition);
        
        float heightFactor = direction.y;
        vec3 baseColor = mix(horizonColor, skyColor, smoothstep(-0.1, 0.5, heightFactor));
        
        float sunDistance = distance(direction, sunPosition);
        float sunIntensity = 1.0 - smoothstep(0.0, 0.15, sunDistance);
        float sunGlow = 1.0 - smoothstep(0.0, 0.4, sunDistance);
        
        // Interpolate sun effects based on transition
        float sunEffect = mix(0.9, 0.1, transitionProgress);
        float glowEffect = mix(0.4, 0.1, transitionProgress);
        
        vec3 finalColor = mix(baseColor, sunColor, sunIntensity * sunEffect);
        finalColor = mix(finalColor, sunColor * mix(0.3, 0.05, transitionProgress), sunGlow * glowEffect);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: THREE.BackSide
  });
  
  skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  scene.add(skybox);
}

function createAmbientLight() {
  // Remove existing ambient light if it exists
  if (ambientLight) {
    scene.remove(ambientLight);
  }
  
  const currentColor = new THREE.Color().lerpColors(dayColors.ambientColor, nightColors.ambientColor, transitionProgress);
  const currentIntensity = THREE.MathUtils.lerp(dayColors.ambientIntensity, nightColors.ambientIntensity, transitionProgress);
  
  ambientLight = new THREE.AmbientLight(currentColor, currentIntensity);
  scene.add(ambientLight);
}

function createDirectionalLight() {
  // Remove existing directional light if it exists
  if (directionalLight) {
    scene.remove(directionalLight);
  }
  
  // Only create directional light if we're not fully in night mode
  if (transitionProgress < 1) {
    const currentIntensity = THREE.MathUtils.lerp(1.0, 0.0, transitionProgress);
    
    directionalLight = new THREE.DirectionalLight(0xffffff, currentIntensity);
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
