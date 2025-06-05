import * as THREE from 'three';
import { scene, camera } from './main.js';
import { getIsNightMode } from './dayNightCycle.js';

// Fog variables
let fogEnabled = true;
let volumetricFog = null;
let atmosphericFog = null;
let fogParticles = [];
let fogAnimationId = null;

// Fog settings
const fogSettings = {
  day: {
    color: new THREE.Color(0xf0f0f0), // Brighter fog color for day
    near: 80, // Increased near distance
    far: 400, // Increased far distance for brighter appearance
    density: 0.001 // Reduced density for brighter effect
  },
  night: {
    color: new THREE.Color(0x1a1a2e),
    near: 30,
    far: 200,
    density: 0.008
  }
};

/**
 * Initialize the fog system
 */
export function initializeFog() {
  createAtmosphericFog();
  createVolumetricFogParticles();
  startFogAnimation();
  
  console.log('Fog effects initialized');
}

/**
 * Toggle fog on/off
 */
export function toggleFog() {
  fogEnabled = !fogEnabled;
  
  if (fogEnabled) {
    createAtmosphericFog();
    createVolumetricFogParticles();
    startFogAnimation();
  } else {
    removeFog();
  }
  
  console.log(`Fog ${fogEnabled ? 'enabled' : 'disabled'}`);
  return fogEnabled;
}

/**
 * Update fog based on day/night cycle
 */
export function updateFogForDayNight() {
  if (!fogEnabled) return;
  
  const isNight = getIsNightMode();
  console.log('Fog update - isNight:', isNight); // Debug log
  
  // Recreate fog particles with correct colors
  createVolumetricFogParticles();
  
  // Update atmospheric fog
  createAtmosphericFog();
}

/**
 * Create basic atmospheric fog
 */
function createAtmosphericFog() {
  if (atmosphericFog) {
    scene.fog = null;
  }
  
  const isNight = getIsNightMode();
  const settings = isNight ? fogSettings.night : fogSettings.day;
  
  if (isNight) {
    // Use exponential fog for night to make it darker at distance
    atmosphericFog = new THREE.FogExp2(settings.color, settings.density);
  } else {
    // Use linear fog for day to keep it brighter at distance
    atmosphericFog = new THREE.Fog(settings.color, settings.near, settings.far);
  }
  
  scene.fog = atmosphericFog;
}

/**
 * Create volumetric fog particles that interact with lights
 */
function createVolumetricFogParticles() {
  // Remove existing particles
  removeParticles();
  
  const particleCount = 8000; // Much higher particle count for density
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const velocities = new Float32Array(particleCount * 3);
  const opacities = new Float32Array(particleCount);
  const rotations = new Float32Array(particleCount);
  
  const isNight = getIsNightMode();
  console.log('Creating ultra-dense soft fog particles - isNight:', isNight);
  
  // Base color
  const baseColor = isNight ? new THREE.Color(0x1a1a3a) : new THREE.Color(0xffffff);
  
  // Create particles in MORE layers for ultra-density
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    // Position particles in MORE layers - 6 layers for density
    const layer = Math.floor(i / (particleCount / 6)); // 6 layers instead of 3
    const layerHeight = 2 + layer * 6; // Even lower and closer together: start at 2, each layer 6 units apart
    
    positions[i3] = (Math.random() - 0.5) * 400; // Slightly smaller spread for density
    positions[i3 + 1] = layerHeight + (Math.random() - 0.5) * 4; // Even smaller height variation
    positions[i3 + 2] = (Math.random() - 0.5) * 400;
    
    // Set base color with less variation for uniformity
    const colorVariation = 0.85 + Math.random() * 0.15; // Reduced variation: 0.85-1.0
    colors[i3] = baseColor.r * colorVariation;
    colors[i3 + 1] = baseColor.g * colorVariation;
    colors[i3 + 2] = baseColor.b * colorVariation;
    
    // Much smaller sizes for softer, denser look
    sizes[i] = Math.random() * 4 + 2; // Smaller sizes: 2-6 instead of 5-13
    
    // Even lower individual opacity for ultra-soft blending
    opacities[i] = Math.random() * 0.08 + 0.01; // Ultra-low: 0.01-0.09
    
    // Slower velocities for calmer movement
    velocities[i3] = (Math.random() - 0.5) * 0.005; // Slower movement
    velocities[i3 + 1] = Math.random() * 0.002 + 0.0005; // Very gentle upward drift
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.005;
    
    rotations[i] = Math.random() * Math.PI * 2;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
  geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));
  
  geometry.userData.velocities = velocities;
  
  // Create ultra-soft, dense fog material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: createUltraSoftTexture() },
      globalOpacity: { value: isNight ? 0.15 : 0.35 }, // Higher global opacity for density
      time: { value: 0.0 }
    },
    vertexShader: `
      attribute float size;
      attribute float opacity;
      attribute float rotation;
      varying vec3 vColor;
      varying float vOpacity;
      varying float vRotation;
      uniform float time;
      
      void main() {
        vColor = color;
        vOpacity = opacity;
        vRotation = rotation + time * 0.02; // Very slow rotation
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Softer size attenuation
        float sizeAttenuation = 250.0 / -mvPosition.z;
        gl_PointSize = size * sizeAttenuation;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform float globalOpacity;
      varying vec3 vColor;
      varying float vOpacity;
      varying float vRotation;
      
      void main() {
        vec2 coord = gl_PointCoord - 0.5;
        float cosRot = cos(vRotation);
        float sinRot = sin(vRotation);
        vec2 rotatedCoord = vec2(
          coord.x * cosRot - coord.y * sinRot,
          coord.x * sinRot + coord.y * cosRot
        ) + 0.5;
        
        vec4 textureColor = texture2D(pointTexture, rotatedCoord);
        
        // Ultra-soft, extended falloff for density
        float centerDistance = distance(gl_PointCoord, vec2(0.5));
        float softFalloff = 1.0 - smoothstep(0.0, 0.9, centerDistance); // Wider falloff
        float ultraSoftFalloff = 1.0 - smoothstep(0.0, 1.2, centerDistance); // Even wider
        
        // Multiple alpha layers for ultra-soft density
        float combinedAlpha = textureColor.a * softFalloff * ultraSoftFalloff * vOpacity * globalOpacity;
        combinedAlpha = pow(combinedAlpha, 0.8); // Gamma correction for softer appearance
        
        // Very soft color enhancement
        vec3 enhancedColor = vColor * textureColor.rgb * (0.9 + ultraSoftFalloff * 0.05);
        
        gl_FragColor = vec4(enhancedColor, combinedAlpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    fog: false,
    vertexColors: true,
    depthWrite: false,
    depthTest: true
  });
  
  volumetricFog = new THREE.Points(geometry, material);
  scene.add(volumetricFog);
  
  fogParticles.push(volumetricFog);
  
  console.log(`Created ultra-dense soft fog with ${particleCount} particles, isNight: ${isNight}`);
}

/**
 * Create an ultra-soft circular texture for fog particles
 */
function createUltraSoftTexture() {
  const canvas = document.createElement('canvas');
  const size = 256; // Even higher resolution for ultra-smooth gradient
  canvas.width = size;
  canvas.height = size;
  
  const context = canvas.getContext('2d');
  const center = size / 2;
  
  // Create even more overlapping gradients for ultra-soft, dense effect
  const gradient1 = context.createRadialGradient(center, center, 0, center, center, center * 0.15);
  gradient1.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient1.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
  
  const gradient2 = context.createRadialGradient(center, center, 0, center, center, center * 0.35);
  gradient2.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient2.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
  
  const gradient3 = context.createRadialGradient(center, center, 0, center, center, center * 0.65);
  gradient3.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  gradient3.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
  
  const gradient4 = context.createRadialGradient(center, center, 0, center, center, center * 0.85);
  gradient4.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  gradient4.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
  gradient4.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  
  // Apply gradients in layers with softer blending
  context.fillStyle = gradient4;
  context.fillRect(0, 0, size, size);
  
  context.globalCompositeOperation = 'multiply'; // Different blending for softer effect
  context.fillStyle = gradient3;
  context.fillRect(0, 0, size, size);
  
  context.globalCompositeOperation = 'screen';
  context.fillStyle = gradient2;
  context.fillRect(0, 0, size, size);
  
  context.globalCompositeOperation = 'screen';
  context.fillStyle = gradient1;
  context.fillRect(0, 0, size, size);
  
  // Apply Gaussian blur effect manually for ultra-softness
  const imageData = context.getImageData(0, 0, size, size);
  const data = imageData.data;
  
  // Create a copy for blur calculation
  const original = new Uint8ClampedArray(data);
  
  // Simple blur kernel
  const blurRadius = 2;
  for (let y = blurRadius; y < size - blurRadius; y++) {
    for (let x = blurRadius; x < size - blurRadius; x++) {
      let totalAlpha = 0;
      let count = 0;
      
      // Sample surrounding pixels
      for (let dy = -blurRadius; dy <= blurRadius; dy++) {
        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
          const sampleX = x + dx;
          const sampleY = y + dy;
          const sampleIndex = (sampleY * size + sampleX) * 4;
          totalAlpha += original[sampleIndex + 3];
          count++;
        }
      }
      
      const currentIndex = (y * size + x) * 4;
      data[currentIndex + 3] = totalAlpha / count; // Average alpha for blur
    }
  }
  
  context.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Update particle colors based on nearby lights
 */
function updateParticlesWithLights() {
  if (!volumetricFog || !fogEnabled) return;
  
  const positions = volumetricFog.geometry.attributes.position.array;
  const colors = volumetricFog.geometry.attributes.color.array;
  const opacities = volumetricFog.geometry.attributes.opacity.array;
  const particleCount = positions.length / 3;
  
  const isNight = getIsNightMode();
  
  // Base colors
  const baseColor = isNight ? new THREE.Color(0x0f0f1f) : new THREE.Color(0xf8f8f8);
  const lightInfluenceRadius = isNight ? 120 : 60;
  
  // Get all point lights in the scene
  const lights = [];
  scene.traverse((child) => {
    if (child.isLight && child.type === 'PointLight') {
      lights.push(child);
    }
  });
  
  // Update each particle
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const particlePos = new THREE.Vector3(
      positions[i3],
      positions[i3 + 1],
      positions[i3 + 2]
    );
    
    let finalColor = baseColor.clone();
    let lightInfluence = 0;
    let opacityMultiplier = 1.0;
    
    if (isNight) {
      // Night mode: particles brighten near lights
      lights.forEach(light => {
        const distance = particlePos.distanceTo(light.position);
        if (distance < lightInfluenceRadius) {
          const influence = Math.pow(1 - (distance / lightInfluenceRadius), 1.5);
          const lightColor = new THREE.Color(light.color);
          
          // Blend light color
          finalColor.lerp(lightColor, influence * 0.8);
          lightInfluence = Math.max(lightInfluence, influence);
        }
      });
      
      // Increase opacity and brightness near lights
      if (lightInfluence > 0) {
        finalColor.multiplyScalar(1 + lightInfluence * 3);
        opacityMultiplier = 1 + lightInfluence * 2;
      }
    } else {
      // Day mode: subtle light influence
      lights.forEach(light => {
        const distance = particlePos.distanceTo(light.position);
        if (distance < lightInfluenceRadius) {
          const influence = 1 - (distance / lightInfluenceRadius);
          const lightColor = new THREE.Color(light.color);
          
          finalColor.lerp(lightColor, influence * 0.1);
        }
      });
      
      // Keep bright during day
      finalColor.multiplyScalar(1.2);
    }
    
    // Apply color
    colors[i3] = Math.min(1, finalColor.r);
    colors[i3 + 1] = Math.min(1, finalColor.g);
    colors[i3 + 2] = Math.min(1, finalColor.b);
    
    // Update individual particle opacity
    const baseOpacity = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
    opacities[i] = Math.min(1, baseOpacity * opacityMultiplier);
  }
  
  volumetricFog.geometry.attributes.color.needsUpdate = true;
  volumetricFog.geometry.attributes.opacity.needsUpdate = true;
  
  // Update global opacity
  if (volumetricFog.material.uniforms) {
    volumetricFog.material.uniforms.globalOpacity.value = isNight ? 0.15 : 0.6;
  }
}

/**
 * Animate fog particles
 */
function animateFogParticles() {
  if (!volumetricFog || !fogEnabled) return;
  
  const positions = volumetricFog.geometry.attributes.position.array;
  const velocities = volumetricFog.geometry.userData.velocities;
  const rotations = volumetricFog.geometry.attributes.rotation.array;
  const particleCount = positions.length / 3;
  
  if (volumetricFog.material.uniforms) {
    volumetricFog.material.uniforms.time.value += 0.005; // Even slower time progression for calmness
  }
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    // Very subtle organic movement for calm, dense fog
    const organicFactor = Math.sin(Date.now() * 0.0003 + i * 0.05) * 0.0005;
    positions[i3] += velocities[i3] + organicFactor;
    positions[i3 + 1] += velocities[i3 + 1];
    positions[i3 + 2] += velocities[i3 + 2] + organicFactor;
    
    rotations[i] += 0.0005 + Math.sin(i * 0.05) * 0.0002; // Very slow rotation
    
    // Reset particles that drift too far - even LOWER ceiling for density
    if (positions[i3 + 1] > 40) { // Slightly higher ceiling to accommodate 6 layers
      positions[i3 + 1] = 1; // Start even lower
      positions[i3] = (Math.random() - 0.5) * 400;
      positions[i3 + 2] = (Math.random() - 0.5) * 400;
    }
    
    // Very soft boundary handling
    if (Math.abs(positions[i3]) > 200) {
      velocities[i3] *= -0.9; // Even softer bounce
    }
    if (Math.abs(positions[i3 + 2]) > 200) {
      velocities[i3 + 2] *= -0.9;
    }
  }
  
  volumetricFog.geometry.attributes.position.needsUpdate = true;
  volumetricFog.geometry.attributes.rotation.needsUpdate = true;
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
      animateFogParticles();
      updateParticlesWithLights();
      fogAnimationId = requestAnimationFrame(animate);
    }
  }
  
  animate();
}

/**
 * Update particle fog colors
 */
function updateParticleFogColors(newColor, isNight) {
  if (!volumetricFog) return;
  
  console.log('Updating fog colors - isNight:', isNight);
  
  const colors = volumetricFog.geometry.attributes.color.array;
  const particleCount = colors.length / 3;
  
  // Softer base colors for dense fog
  const fogColor = isNight ? new THREE.Color(0x0f0f20) : new THREE.Color(0xe0e0e0); // Softer colors
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    colors[i3] = fogColor.r;
    colors[i3 + 1] = fogColor.g;
    colors[i3 + 2] = fogColor.b;
  }
  
  volumetricFog.geometry.attributes.color.needsUpdate = true;
  
  // Higher global opacity for dense fog
  if (volumetricFog.material.uniforms) {
    volumetricFog.material.uniforms.globalOpacity.value = isNight ? 0.15 : 0.35;
  }
  
  console.log(`Updated dense fog for ${isNight ? 'night' : 'day'} mode`);
}

/**
 * Remove all fog effects
 */
function removeFog() {
  // Remove atmospheric fog
  scene.fog = null;
  atmosphericFog = null;
  
  // Remove particle fog
  removeParticles();
  
  // Stop animation
  if (fogAnimationId) {
    cancelAnimationFrame(fogAnimationId);
    fogAnimationId = null;
  }
}

/**
 * Remove particle fog from scene
 */
function removeParticles() {
  fogParticles.forEach(particles => {
    if (particles.parent) {
      particles.parent.remove(particles);
    }
    if (particles.geometry) {
      particles.geometry.dispose();
    }
    if (particles.material) {
      particles.material.dispose();
    }
  });
  
  fogParticles.length = 0;
  volumetricFog = null;
}

/**
 * Get fog enabled status
 */
export function isFogEnabled() {
  return fogEnabled;
}
