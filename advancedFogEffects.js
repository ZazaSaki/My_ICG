import * as THREE from 'three';
import { scene, camera } from './main.js';
import { getIsNightMode } from './dayNightCycle.js';

// Advanced fog variables
let volumetricFogMesh = null;
let fogUniforms = null;
let fogAnimationId = null;
let fogEnabled = true;

/**
 * Initialize advanced volumetric fog system
 */
export function initializeAdvancedFog() {
  createVolumetricFogMesh();
  startFogAnimation();
  console.log('Advanced volumetric fog initialized');
}

/**
 * Toggle advanced fog on/off
 */
export function toggleAdvancedFog() {
  fogEnabled = !fogEnabled;
  
  if (fogEnabled) {
    createVolumetricFogMesh();
    startFogAnimation();
  } else {
    removeAdvancedFog();
  }
  
  console.log(`Advanced fog ${fogEnabled ? 'enabled' : 'disabled'}`);
  return fogEnabled;
}

/**
 * Create volumetric fog using raymarching
 */
function createVolumetricFogMesh() {
  if (volumetricFogMesh) {
    scene.remove(volumetricFogMesh);
  }
  
  const isNight = getIsNightMode();
  
  // Create fog uniforms with more visible settings
  fogUniforms = {
    time: { value: 0.0 },
    cameraPosition: { value: camera.position },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    fogDensity: { value: isNight ? 0.15 : 0.08 }, // Increased density
    fogColor: { value: isNight ? new THREE.Color(0x1a1a2e) : new THREE.Color(0xf0f0f0) },
    lightAbsorption: { value: isNight ? 0.2 : 0.05 }, // Reduced absorption for more visibility
    scattering: { value: isNight ? 0.8 : 1.2 }, // Increased scattering
    lightPositions: { value: [] },
    lightColors: { value: [] },
    lightIntensities: { value: [] },
    numLights: { value: 0 },
    fogHeight: { value: 50.0 }, // Increased height
    fogFalloff: { value: 0.05 }, // Reduced falloff for more volume
    noiseScale: { value: 0.015 }, // Slightly larger noise features
    windDirection: { value: new THREE.Vector2(1.0, 0.5) },
    windSpeed: { value: 0.3 }
  };
  
  // Update light data
  updateLightData();
  
  // Create fog geometry (larger box for better coverage)
  const fogGeometry = new THREE.BoxGeometry(1200, 120, 1200);
  
  // Enhanced volumetric fog shader with better visibility
  const fogMaterial = new THREE.ShaderMaterial({
    uniforms: fogUniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = viewPosition.xyz;
        
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 cameraPosition;
      uniform vec2 resolution;
      uniform float fogDensity;
      uniform vec3 fogColor;
      uniform float lightAbsorption;
      uniform float scattering;
      uniform vec3 lightPositions[20];
      uniform vec3 lightColors[20];
      uniform float lightIntensities[20];
      uniform int numLights;
      uniform float fogHeight;
      uniform float fogFalloff;
      uniform float noiseScale;
      uniform vec2 windDirection;
      uniform float windSpeed;
      
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      
      // Simplified noise function for better performance
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        
        return mix(mix(mix(hash(i + vec3(0,0,0)), 
                          hash(i + vec3(1,0,0)), f.x),
                      mix(hash(i + vec3(0,1,0)), 
                          hash(i + vec3(1,1,0)), f.x), f.y),
                  mix(mix(hash(i + vec3(0,0,1)), 
                          hash(i + vec3(1,0,1)), f.x),
                      mix(hash(i + vec3(0,1,1)), 
                          hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      
      // Fractal noise
      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        
        for(int i = 0; i < 3; i++) { // Reduced iterations for performance
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      // Calculate fog density at a point
      float getFogDensity(vec3 pos) {
        // Height-based fog falloff - more gradual
        float heightFactor = exp(-max(0.0, pos.y - 2.0) * fogFalloff);
        
        // Add wind animation
        vec3 windOffset = vec3(windDirection.x, 0.0, windDirection.y) * time * windSpeed;
        
        // Simpler noise for better performance and visibility
        float noise1 = fbm((pos + windOffset) * noiseScale);
        float combinedNoise = noise1 * 0.5 + 0.5;
        
        // Increase base density for better visibility
        return fogDensity * heightFactor * (0.3 + combinedNoise * 0.7);
      }
      
      // Light scattering calculation
      vec3 calculateLightScattering(vec3 rayPos, vec3 rayDir) {
        vec3 scatteredLight = vec3(0.0);
        
        for(int i = 0; i < 20; i++) {
          if(i >= numLights) break;
          
          vec3 lightPos = lightPositions[i];
          vec3 lightColor = lightColors[i];
          float lightIntensity = lightIntensities[i];
          
          vec3 lightDir = lightPos - rayPos;
          float lightDistance = length(lightDir);
          lightDir = normalize(lightDir);
          
          // Enhanced light attenuation
          float attenuation = lightIntensity / (1.0 + 0.005 * lightDistance + 0.0001 * lightDistance * lightDistance);
          
          // Simple forward scattering
          float cosTheta = dot(rayDir, lightDir);
          float phase = 0.5 + 0.5 * cosTheta;
          
          // Light contribution - more visible
          scatteredLight += lightColor * attenuation * phase * scattering * 2.0;
        }
        
        return scatteredLight;
      }
      
      void main() {
        vec3 rayStart = cameraPosition;
        vec3 rayEnd = vWorldPosition;
        vec3 rayDir = normalize(rayEnd - rayStart);
        float rayLength = length(rayEnd - rayStart);
        
        // Raymarching parameters - reduced steps for performance
        int steps = 24;
        float stepSize = rayLength / float(steps);
        
        vec3 currentPos = rayStart;
        vec3 accumulatedColor = vec3(0.0);
        float accumulatedAlpha = 0.0;
        
        // Raymarch through the fog
        for(int i = 0; i < 24; i++) {
          if(i >= steps) break;
          
          float density = getFogDensity(currentPos);
          
          if(density > 0.01) { // Lower threshold for more visible fog
            // Calculate light scattering at current position
            vec3 lightContribution = calculateLightScattering(currentPos, rayDir);
            
            // Accumulate color and alpha - enhanced visibility
            vec3 fogContribution = (fogColor + lightContribution) * density * stepSize * 3.0; // Increased multiplier
            accumulatedColor += fogContribution * (1.0 - accumulatedAlpha);
            accumulatedAlpha += density * stepSize * 2.0 * (1.0 - accumulatedAlpha); // Increased alpha accumulation
            
            // Early termination if fog is opaque
            if(accumulatedAlpha >= 0.9) break;
          }
          
          currentPos += rayDir * stepSize;
        }
        
        // Enhanced output with better visibility
        accumulatedColor = accumulatedColor * 1.5; // Brighten the result
        accumulatedAlpha = min(accumulatedAlpha * 1.2, 0.8); // Increase alpha but cap it
        
        gl_FragColor = vec4(accumulatedColor, accumulatedAlpha);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
  
  volumetricFogMesh = new THREE.Mesh(fogGeometry, fogMaterial);
  volumetricFogMesh.position.set(0, 20, 0); // Position fog higher for better visibility
  scene.add(volumetricFogMesh);
}

/**
 * Update fog for day/night cycle
 */
export function updateAdvancedFogForDayNight() {
  if (!fogEnabled || !fogUniforms) return;
  
  const isNight = getIsNightMode();
  
  // Update fog parameters with more visible settings
  fogUniforms.fogDensity.value = isNight ? 0.15 : 0.08;
  fogUniforms.fogColor.value = isNight ? 
    new THREE.Color(0x1a1a2e) : 
    new THREE.Color(0xf0f0f0);
  fogUniforms.lightAbsorption.value = isNight ? 0.2 : 0.05;
  fogUniforms.scattering.value = isNight ? 0.8 : 1.2;
}

/**
 * Update fog density from external control
 */
export function updateFogDensity(density) {
  if (fogUniforms && fogUniforms.fogDensity) {
    fogUniforms.fogDensity.value = density;
    console.log(`Updated fog density to: ${density}`);
  }
}

/**
 * Update light scattering from external control
 */
export function updateLightScattering(scattering) {
  if (fogUniforms && fogUniforms.scattering) {
    fogUniforms.scattering.value = scattering;
    console.log(`Updated light scattering to: ${scattering}`);
  }
}

/**
 * Update light data for fog calculations
 */
function updateLightData() {
  if (!fogUniforms) return;
  
  const lightPositions = [];
  const lightColors = [];
  const lightIntensities = [];
  
  scene.traverse((child) => {
    if (child.isLight && child.type === 'PointLight' && lightPositions.length < 20) {
      lightPositions.push(child.position.x, child.position.y, child.position.z);
      lightColors.push(child.color.r, child.color.g, child.color.b);
      lightIntensities.push(child.intensity);
    }
  });
  
  // Pad arrays to fixed size
  while (lightPositions.length < 60) lightPositions.push(0);
  while (lightColors.length < 60) lightColors.push(0);
  while (lightIntensities.length < 20) lightIntensities.push(0);
  
  fogUniforms.lightPositions.value = lightPositions;
  fogUniforms.lightColors.value = lightColors;
  fogUniforms.lightIntensities.value = lightIntensities;
  fogUniforms.numLights.value = Math.min(Math.floor(lightPositions.length / 3), 20);
}

/**
 * Animate the fog
 */
function animateFog() {
  if (!fogEnabled || !fogUniforms) return;
  
  fogUniforms.time.value += 0.016;
  fogUniforms.cameraPosition.value.copy(camera.position);
  
  // Update light data periodically
  if (Math.floor(fogUniforms.time.value * 10) % 10 === 0) {
    updateLightData();
  }
}

/**
 * Start fog animation loop
 */
function startFogAnimation() {
  if (fogAnimationId) {
    cancelAnimationFrame(fogAnimationId);
  }
  
  function animate() {
    if (fogEnabled) {
      animateFog();
      fogAnimationId = requestAnimationFrame(animate);
    }
  }
  
  animate();
}

/**
 * Remove advanced fog
 */
function removeAdvancedFog() {
  if (volumetricFogMesh) {
    scene.remove(volumetricFogMesh);
    volumetricFogMesh = null;
  }
  
  if (fogAnimationId) {
    cancelAnimationFrame(fogAnimationId);
    fogAnimationId = null;
  }
  
  fogUniforms = null;
}

/**
 * Get fog enabled status
 */
export function isAdvancedFogEnabled() {
  return fogEnabled;
}
