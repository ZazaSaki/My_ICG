import * as THREE from 'three';
import { scene, collidableObjects } from './main.js';
import { createVisibleHitbox } from './hitboxUtils.js';

/**
 * Creates a cylinder with custom properties and adds it to the scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 * @param {number} radiusTop - Radius of the cylinder at the top
 * @param {number} radiusBottom - Radius of the cylinder at the bottom
 * @param {number} height - Height of the cylinder
 * @param {number} segments - Number of segments (radial divisions)
 * @param {THREE.Material} material - Material to use for the cylinder
 * @param {boolean} isCollidable - Whether the cylinder should be added to collidable objects
 * @returns {THREE.Mesh} - The created cylinder mesh
 */
export function createCustomCylinder(
  x, 
  y, 
  z, 
  radiusTop, 
  radiusBottom, 
  height, 
  segments, 
  material, 
  isCollidable = true
) {
  const geometry = new THREE.CylinderGeometry(
    radiusTop, 
    radiusBottom, 
    height, 
    segments
  );
  
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.position.set(x, y, z);
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  scene.add(cylinder);
  
  if (isCollidable) {
    collidableObjects.push(cylinder);
  }
  
  return cylinder;
}

/**
 * Adds a point light to a cylinder for illumination
 * @param {THREE.Mesh} cylinder - The cylinder to add light to
 * @param {number} intensity - Light intensity (default: 1.5)
 * @param {number} distance - Light distance (default: 50)
 * @param {THREE.Color|number} color - Light color (default: warm white)
 */
function addLightToCylinder(cylinder, intensity = 1.5, distance = 50, color = 0xfff4e6) {
  const light = new THREE.PointLight(color, intensity, distance);
  
  // Position the light above the cylinder
  const cylinderRadius = cylinder.geometry.parameters.radiusTop || cylinder.geometry.parameters.radius || 10;
  light.position.set(0, cylinderRadius + 15, 0);
  
  // Add the light as a child of the cylinder so it moves with it
  cylinder.add(light);
  
  // Optional: Add a small glowing sphere to visualize the light source
  const lightSphereGeometry = new THREE.SphereGeometry(2, 8, 8);
  const lightSphereMaterial = new THREE.MeshBasicMaterial({ 
    color: color,
    transparent: true,
    opacity: 0.6
  });
  const lightSphere = new THREE.Mesh(lightSphereGeometry, lightSphereMaterial);
  lightSphere.position.copy(light.position);
  cylinder.add(lightSphere);
  
  return light;
}

/**
 * Gets a random warm light color
 * @returns {number} - A random warm color value
 */
function getRandomLightColor() {
  const colors = [
    0xfff4e6, // Warm white
    0xffe4b5, // Moccasin
    0xffd700, // Gold
    0xffa500, // Orange
    0xff6347, // Tomato
    0x87ceeb, // Sky blue
    0x98fb98, // Pale green
    0xdda0dd  // Plum
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Adds multiple point lights to a cylinder for enhanced illumination
 * @param {THREE.Mesh} cylinder - The cylinder to add lights to
 * @param {number} numLights - Number of lights to add (default: 2)
 * @param {number} baseIntensity - Base light intensity (default: 1.0)
 * @param {number} baseDistance - Base light distance (default: 40)
 */
function addMultipleLightsToCylinder(cylinder, numLights = 2, baseIntensity = 1.0, baseDistance = 40) {
  const cylinderRadius = cylinder.geometry.parameters.radiusTop || cylinder.geometry.parameters.radius || 10;
  const cylinderHeight = cylinder.geometry.parameters.height || 10;
  
  // Create a group to hold all lights for this cylinder
  const lightGroup = new THREE.Group();
  
  // Reduce number of lights to prevent performance issues
  const maxLights = Math.min(numLights, 2); // Cap at 2 lights max
  
  for (let i = 0; i < maxLights; i++) {
    // Get varied colors for each light
    const lightColor = getRandomLightColor();
    const intensity = baseIntensity * 3.0 + Math.random() * 2.0; // Much higher intensity
    const distance = baseDistance * 2 + Math.random() * 30; // Increased distance
    
    // Create point light
    const light = new THREE.PointLight(lightColor, intensity, distance, 2); // Added decay parameter
    
    // Position lights around and above the cylinder - better positioning
    const angle = (i / maxLights) * Math.PI * 2;
    const radiusOffset = cylinderRadius * 0.5; // Closer to cylinder center
    const heightOffset = cylinderRadius * 1.5; // Higher above cylinder
    
    light.position.set(
      Math.cos(angle) * radiusOffset,
      heightOffset,
      Math.sin(angle) * radiusOffset
    );
    
    // Enable shadows for the lights
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = distance;
    
    lightGroup.add(light);
    
    // Add small glowing sphere for each light - brighter
    const lightSphereGeometry = new THREE.SphereGeometry(1.5, 8, 8);
    const lightSphereMaterial = new THREE.MeshBasicMaterial({ 
      color: lightColor,
      transparent: false, // Make solid for better visibility
      emissive: lightColor,
      emissiveIntensity: 0.8
    });
    const lightSphere = new THREE.Mesh(lightSphereGeometry, lightSphereMaterial);
    lightSphere.position.copy(light.position);
    lightGroup.add(lightSphere);
  }
  
  // Add one central top light - much stronger
  const centralLight = new THREE.PointLight(0xffffff, baseIntensity * 4.0, baseDistance * 2.5, 2);
  centralLight.position.set(0, cylinderRadius * 2, 0); // Higher position
  
  // Enable shadows for central light
  centralLight.castShadow = true;
  centralLight.shadow.mapSize.width = 1024;
  centralLight.shadow.mapSize.height = 1024;
  centralLight.shadow.camera.near = 0.1;
  centralLight.shadow.camera.far = baseDistance * 2.5;
  
  lightGroup.add(centralLight);
  
  // Central light sphere - much brighter and emissive
  const centralSphere = new THREE.Mesh(
    new THREE.SphereGeometry(2, 8, 8),
    new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: false,
      emissive: 0xffffff,
      emissiveIntensity: 1.0
    })
  );
  centralSphere.position.copy(centralLight.position);
  lightGroup.add(centralSphere);
  
  // Add the entire light group to the cylinder
  cylinder.add(lightGroup);
  
  return lightGroup;
}

/**
 * Adds a simple but effective light to a cylinder
 * @param {THREE.Mesh} cylinder - The cylinder to add light to
 * @param {number} intensity - Light intensity
 * @param {number} distance - Light distance
 * @param {number} color - Light color
 */
function addSimpleLightToCylinder(cylinder, intensity = 15.0, distance = 150, color = 0xffffff) {
  const cylinderRadius = cylinder.geometry.parameters.radiusTop || cylinder.geometry.parameters.radius || 10;
  
  // Create a single, very strong point light
  const light = new THREE.PointLight(color, intensity, distance, 1); // decay = 1 for more realistic falloff
  
  // Position light above cylinder
  const lightX = cylinder.position.x;
  const lightY = cylinder.position.y + cylinderRadius + 15;
  const lightZ = cylinder.position.z;
  
  light.position.set(lightX, lightY, lightZ);
  
  // Add directly to scene
  scene.add(light);
  
  // Add a very bright glowing sphere
  const glowGeometry = new THREE.SphereGeometry(4, 8, 8);
  const glowMaterial = new THREE.MeshBasicMaterial({ 
    color: color,
    emissive: color,
    emissiveIntensity: 2.0 // Very bright
  });
  const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
  glowSphere.position.set(0, cylinderRadius + 15, 0);
  cylinder.add(glowSphere);
  
  console.log(`Added strong light with intensity ${intensity} at world position:`, light.position);
  
  // Store light reference for cleanup
  if (!cylinder.userData.lights) {
    cylinder.userData.lights = [];
  }
  cylinder.userData.lights.push(light);
  
  return light;
}

/**
 * Adds multiple simple lights to a cylinder
 * @param {THREE.Mesh} cylinder - The cylinder to add lights to
 * @param {number} numLights - Number of lights to add
 * @param {number} intensity - Light intensity per light
 * @param {number} distance - Light distance
 * @param {number} color - Light color
 */
function addMultipleSimpleLightsToCylinder(cylinder, numLights = 3, intensity = 12.0, distance = 120, color = 0xffffff) {
  const cylinderRadius = cylinder.geometry.parameters.radiusTop || cylinder.geometry.parameters.radius || 10;
  
  // Create multiple lights around the cylinder with moderate intensity
  for (let i = 0; i < numLights; i++) {
    // Create a moderately strong point light
    const light = new THREE.PointLight(color, intensity, distance, 1.2); // Normal decay
    
    // Position lights in a circle around and above the cylinder
    const angle = (i / numLights) * Math.PI * 2;
    const radiusOffset = cylinderRadius * 0.8; // Position around the cylinder edge
    const heightVariation = 15 + Math.random() * 20; // Height variation
    
    const lightX = cylinder.position.x + Math.cos(angle) * radiusOffset;
    const lightY = cylinder.position.y + cylinderRadius + heightVariation;
    const lightZ = cylinder.position.z + Math.sin(angle) * radiusOffset;
    
    light.position.set(lightX, lightY, lightZ);
    scene.add(light);
    
    // Create bright glowing spheres that appear very luminous
    const sphereSize = 3 + Math.random() * 2; // Moderate size: 3-5
    const glowGeometry = new THREE.SphereGeometry(sphereSize, 12, 12);
    
    // Use a brighter color for the sphere than the light
    const brighterColor = new THREE.Color(color).multiplyScalar(1.5);
    
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: brighterColor,
      emissive: brighterColor,
      emissiveIntensity: 3.0, // Very bright emissive
      transparent: true,
      opacity: 0.9 // Slight transparency for glow effect
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    
    // Position the sphere relative to the cylinder
    glowSphere.position.set(
      Math.cos(angle) * radiusOffset,
      cylinderRadius + heightVariation,
      Math.sin(angle) * radiusOffset
    );
    cylinder.add(glowSphere);
    
    // Store light reference for cleanup
    if (!cylinder.userData.lights) {
      cylinder.userData.lights = [];
    }
    cylinder.userData.lights.push(light);
  }
  
  // Add one central light above the cylinder - moderate strength
  const centralLight = new THREE.PointLight(color, intensity * 1.3, distance * 1.2, 1.0); // Moderate central light
  const centralX = cylinder.position.x;
  const centralY = cylinder.position.y + cylinderRadius + 25;
  const centralZ = cylinder.position.z;
  
  centralLight.position.set(centralX, centralY, centralZ);
  scene.add(centralLight);
  
  // Central glowing sphere - very bright and luminous
  const centralGlowGeometry = new THREE.SphereGeometry(6, 16, 16);
  const centralBrighterColor = new THREE.Color(color).multiplyScalar(1.8);
  
  const centralGlowMaterial = new THREE.MeshBasicMaterial({ 
    color: centralBrighterColor,
    emissive: centralBrighterColor,
    emissiveIntensity: 4.0, // Extremely bright emissive
    transparent: true,
    opacity: 0.95
  });
  const centralGlowSphere = new THREE.Mesh(centralGlowGeometry, centralGlowMaterial);
  centralGlowSphere.position.set(0, cylinderRadius + 25, 0);
  cylinder.add(centralGlowSphere);
  
  cylinder.userData.lights.push(centralLight);
  
  console.log(`Added ${numLights + 1} moderate lights with very bright glowing spheres to cylinder`);
  return cylinder.userData.lights;
}

/**
 * Creates a simple cylinder with the same radius at top and bottom
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 * @param {number} radius - Radius of the cylinder
 * @param {THREE.Material} material - Material to use for the cylinder
 * @param {number} height - Height of the cylinder
 * @param {number} segments - Number of segments (radial divisions)
 * @returns {THREE.Mesh} - The created cylinder mesh
 */
export function createSimpleCylinder(
  x, 
  y, 
  z, 
  radius, 
  material = new THREE.MeshStandardMaterial({
    color: 0x4682B4,
    roughness: 0.6,
    metalness: 0.1
  }), 
  height = 1 , 
  segments = 32) 
  {
  const cylinder = createCustomCylinder(x, y, z, radius, radius, height, segments, material);
  
  // Create visible hitbox
  createVisibleHitbox(cylinder, 0x00ff00);
  
  // Add moderate lights with very bright glowing spheres
  const lightColor = getRandomLightColor();
  const numLights = 4 + Math.floor(Math.random() * 3); // 4-6 lights per cylinder
  addMultipleSimpleLightsToCylinder(cylinder, numLights, 15.0, radius * 8 + 100, lightColor); // Moderate intensity
  
  return cylinder;
}
