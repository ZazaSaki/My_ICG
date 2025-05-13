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
    roughness: 0.6
  }), 
  height = 1 , 
  segments = 32) 
  {
  const cylinder = createCustomCylinder(x, y, z, radius, radius, height, segments, material);
  
  // Create visible hitbox
  createVisibleHitbox(cylinder, 0x00ff00);
  
  return cylinder;
}
