import * as THREE from 'three';
import { scene } from './main.js';

// Track all hitbox meshes for toggling visibility
export const hitboxMeshes = [];

/**
 * Creates a visible hitbox for an object
 * @param {THREE.Mesh} object - The object to create a hitbox for
 * @param {number} color - Color of the hitbox wireframe
 * @returns {THREE.Mesh} - The created hitbox mesh
 */
export function createVisibleHitbox(object, color = 0xff0000) {
    // Clone the geometry
    const hitboxGeometry = object.geometry.clone();
    
    // Create wireframe material
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        opacity: 0.5,
        transparent: true
    });
    
    // Create mesh
    const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    
    // Copy position, rotation, and scale
    hitboxMesh.position.copy(object.position);
    hitboxMesh.quaternion.copy(object.quaternion);
    hitboxMesh.scale.copy(object.scale);
    
    // Add to scene and tracking array
    scene.add(hitboxMesh);
    hitboxMeshes.push(hitboxMesh);
    
    // Initially hide hitboxes
    hitboxMesh.visible = false;
    
    return hitboxMesh;
}

/**
 * Toggle visibility of all hitboxes
 */
export function toggleHitboxVisibility() {
    const newVisibility = !hitboxMeshes[0]?.visible;
    
    hitboxMeshes.forEach(hitbox => {
        hitbox.visible = newVisibility;
    });
    
    console.log(`Hitboxes ${newVisibility ? 'shown' : 'hidden'}`);
}
