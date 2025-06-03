import * as THREE from 'three';
import { scene, controls, renderer, camera, collidableObjects, playerHeight, playerRadius } from './main.js';

// Player movement variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let jumpCount = 0;

// Player physics
export const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

// Player settings
export const jumpHeight = 35;
export const gravity = 9.8 * 10;
export const maxJumps = 30000;

// Player collider - visual representation
let playerCollider;
let animationFrameId;

// Foto mode variables
let isPaused = false;
let fotoModeEnabled = false;
let pauseOverlay;
let pauseMenu;

export function setupPlayer() {
  console.log("Setting up player");
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  
  // Initialize player state
  canJump = true;
  
  // Create visual player collider
  createPlayerCollider();
  
  // Create pause overlay
  createPauseOverlay();
  
  // Expose reset function globally
  window.resetPlayerState = resetPlayerState;
  
  // Start animation loop
  animatePlayer();
}

// Add function to reset player state
function resetPlayerState() {
  console.log("Resetting player state");
  
  // Reset all movement variables
  moveForward = false;
  moveBackward = false;
  moveLeft = false;
  moveRight = false;
  canJump = true;
  jumpCount = 0;
  
  // Reset velocity
  velocity.set(0, 0, 0);
  
  // Reset direction
  direction.set(0, 0, 0);
  
  // Reset physics state
  isPaused = false;
  
  // Hide pause overlay if shown
  if (pauseOverlay) {
    pauseOverlay.style.display = 'none';
  }
  
  // Position player on root node if available
  if (controls.getObject && window.rootNodePosition) {
    const controlsObject = controls.getObject();
    controlsObject.position.set(
      window.rootNodePosition.x,
      window.rootNodePosition.y,
      window.rootNodePosition.z
    );
    console.log("Player positioned on root node at:", window.rootNodePosition);
  }
}

function createPauseOverlay() {
  pauseOverlay = document.createElement('div');
  pauseOverlay.style.position = 'absolute';
  pauseOverlay.style.top = '0';
  pauseOverlay.style.left = '0';
  pauseOverlay.style.right = '0';
  pauseOverlay.style.bottom = '0';
  pauseOverlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
  pauseOverlay.style.display = 'none';
  pauseOverlay.style.flexDirection = 'column';
  pauseOverlay.style.justifyContent = 'center';
  pauseOverlay.style.alignItems = 'center';
  pauseOverlay.style.color = '#fff';
  pauseOverlay.style.fontSize = '24px';
  pauseOverlay.style.zIndex = '1000';
  
  // Create pause menu
  pauseMenu = document.createElement('div');
  pauseMenu.style.backgroundColor = 'rgba(0,0,0,0.9)';
  pauseMenu.style.padding = '30px';
  pauseMenu.style.borderRadius = '10px';
  pauseMenu.style.border = '2px solid #fff';
  pauseMenu.style.textAlign = 'center';
  pauseMenu.style.minWidth = '300px';
  
  pauseMenu.innerHTML = `
    <h2 style="margin-top: 0; color: #fff;">PAUSED</h2>
    <div style="margin: 20px 0;">
      <button id="resumeBtn" style="
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 12px 24px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        min-width: 120px;
      ">Resume</button>
    </div>
    <div style="margin: 20px 0;">
      <button id="uploadJsonBtn" style="
        background-color: #2196F3;
        color: white;
        border: none;
        padding: 12px 24px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        min-width: 120px;
      ">Upload JSON</button>
    </div>
    <div style="margin: 20px 0;">
      <button id="createTreeBtn" style="
        background-color: #9C27B0;
        color: white;
        border: none;
        padding: 12px 24px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        min-width: 120px;
      ">Create Tree</button>
    </div>
    <div style="margin: 20px 0;">
      <button id="resetWorldBtn" style="
        background-color: #ff6b6b;
        color: white;
        border: none;
        padding: 12px 24px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        min-width: 120px;
      ">Reset World</button>
    </div>
    <div style="margin-top: 30px; font-size: 14px; color: #ccc;">
      <p>Controls:</p>
      <p>WASD - Move | Space - Jump | Mouse - Look</p>
      <p>P - Toggle Photo Mode | ESC - Pause Menu</p>
      <p>H - Toggle Hitboxes</p>
    </div>
  `;
  
  pauseOverlay.appendChild(pauseMenu);
  document.body.appendChild(pauseOverlay);
  
  // Add event listeners for menu buttons
  setupPauseMenuListeners();
}

function setupPauseMenuListeners() {
  document.getElementById('resumeBtn').addEventListener('click', () => {
    togglePause();
  });
  
  document.getElementById('uploadJsonBtn').addEventListener('click', () => {
    // Trigger the file input
    document.getElementById('fileInput').click();
  });
  
  document.getElementById('createTreeBtn').addEventListener('click', () => {
    // Open the tree creator in a new tab
    window.open('https://liber-metrika.vercel.app/tree_interactor', '_blank');
  });
  
  document.getElementById('resetWorldBtn').addEventListener('click', () => {
    // Reset to default world
    if (window.resetToDefaultWorld) {
      window.resetToDefaultWorld();
    }
    togglePause(); // Resume after reset
  });
  
  // Listen for successful file upload to close menu and reload
  document.addEventListener('worldReloaded', () => {
    console.log("World reloaded event received");
    if (isPaused) {
      togglePause(); // Close pause menu after successful upload
    }
    // Small delay to ensure world is fully loaded before resuming physics
    setTimeout(() => {
      resetPlayerState();
    }, 100);
  });
  
  // Add hover effects
  const buttons = pauseMenu.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.style.opacity = '0.8';
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.opacity = '1';
      button.style.transform = 'scale(1)';
    });
  });
}

function togglePause() {
  isPaused = !isPaused;
  if (isPaused) {
    pauseOverlay.style.display = 'flex';
    // Lock the pointer to prevent camera movement while paused
    if (controls.isLocked) {
      controls.unlock();
    }
  } else {
    pauseOverlay.style.display = 'none';
  }
}

function toggleFotoMode() {
  fotoModeEnabled = !fotoModeEnabled;
  console.log(`Foto mode ${fotoModeEnabled ? 'enabled' : 'disabled'}`);
  
  // If foto mode is disabled and currently paused, unpause
  if (!fotoModeEnabled && isPaused) {
    togglePause();
  }
}

/**
 * Creates a visual representation of the player's collision volume
 */
function createPlayerCollider() {
  // Create a sphere to represent the player collision volume
  const geometry = new THREE.SphereGeometry(playerRadius, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    opacity: 0.5,
    transparent: true
  });
  
  playerCollider = new THREE.Mesh(geometry, material);
  playerCollider.position.y = -playerHeight; // Position relative to camera
  
  // Add collider to the camera/controls
  controls.getObject().add(playerCollider);
  
  console.log("Player collider created");
}

function onKeyDown(event) {
  // Handle foto mode
  if (event.code === 'KeyP') {
    toggleFotoMode();
    return;
  }
  
  if (event.code === 'Escape') {
    if (fotoModeEnabled || !controls.isLocked) {
      togglePause();
    }
    return;
  }
  
  // Skip movement if paused
  if (isPaused) return;
  
  switch (event.code) {
    case 'KeyW': 
      moveForward = true; 
      console.log('W pressed - moveForward:', moveForward);
      break;
    case 'KeyA': 
      moveLeft = true; 
      console.log('A pressed - moveLeft:', moveLeft);
      break;
    case 'KeyS': 
      moveBackward = true; 
      console.log('S pressed - moveBackward:', moveBackward);
      break;
    case 'KeyD': 
      moveRight = true; 
      console.log('D pressed - moveRight:', moveRight);
      break;
    case 'Space': 
      if (canJump || jumpCount < maxJumps) {
        velocity.y += jumpHeight;
        canJump = false;
        jumpCount++;
      }
      break;
  }
}

function onKeyUp(event) {
  // Skip if paused
  if (isPaused) return;
  
  switch (event.code) {
    case 'KeyW': 
      moveForward = false; 
      console.log('W released - moveForward:', moveForward);
      break;
    case 'KeyA': 
      moveLeft = false; 
      console.log('A released - moveLeft:', moveLeft);
      break;
    case 'KeyS': 
      moveBackward = false; 
      console.log('S released - moveBackward:', moveBackward);
      break;
    case 'KeyD': 
      moveRight = false; 
      console.log('D released - moveRight:', moveRight);
      break;
  }
}

// Check for collisions with objects
function checkCollision(position) {
  try {
    for (const object of collidableObjects) {
      // Special handling for bridge colliders created in bridgeUtils.js
      if (object.userData && object.userData.isBridgeCollider) {
        // Use specialized bridge collision logic
        if (checkBridgeColliderCollision(position, object)) {
          return true;
        }
        continue;
      }
      
      // Special handling for bridge hitboxes
      if (object.userData && (object.userData.type === 'bridgeHitbox' || object.userData.bridgeHitbox === true)) {
        // For bridge hitboxes, use a more accurate collision detection
        if (checkBridgeCollision(position, object)) {
          return true;
        }
        continue; // Skip regular collision check
      }
      
      // Special handling for cylinders
      if (object.geometry instanceof THREE.CylinderGeometry) {
        // Calculate horizontal distance to cylinder center
        const cylinderPosition = object.position.clone();
        
        // Convert both positions to horizontal only (ignore y/height)
        const horizontalPosition = position.clone();
        horizontalPosition.y = 0;
        
        const horizontalCylinderPosition = cylinderPosition.clone();
        horizontalCylinderPosition.y = 0;
        
        // Get horizontal distance
        const distance = horizontalPosition.distanceTo(horizontalCylinderPosition);
        
        // Get cylinder properties
        const radius = object.geometry.parameters.radiusTop;
        
        // Check vertical overlap (is player within the height of the cylinder?)
        const cylinderHeight = object.geometry.parameters.height;
        const cylinderTop = cylinderPosition.y + cylinderHeight / 2;
        const cylinderBottom = cylinderPosition.y - cylinderHeight / 2;
        
        const playerBottom = position.y - playerRadius;
        const playerTop = position.y + playerRadius;
        
        const verticalOverlap = 
          (playerBottom <= cylinderTop && playerBottom >= cylinderBottom) || 
          (playerTop >= cylinderBottom && playerTop <= cylinderTop) ||
          (playerBottom <= cylinderBottom && playerTop >= cylinderTop);
        
        // If horizontal distance is less than sum of radii and there's vertical overlap
        if (distance < radius + playerRadius && verticalOverlap) {
          return true;
        }
      }
      // For other objects, continue using box collision
      else if (object.geometry) {
        // Get object bounds
        const objectBox = new THREE.Box3().setFromObject(object);
        
        // Create player bounds (simple sphere approximation)
        // Use a slightly smaller radius for horizontal movement to prevent getting stuck
        const horizontalRadius = playerRadius * 0.9;
        const playerBounds = new THREE.Sphere(position, horizontalRadius);
        
        // Check for collision
        if (objectBox.intersectsSphere(playerBounds)) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error("Error in collision detection:", error);
    return false; // Prevent game from crashing on collision errors
  }
}

/**
 * Special collision handler for bridge colliders created by bridgeUtils.js
 */
function checkBridgeColliderCollision(position, bridgeObject) {
  try {
    // Get the bridge's world matrix to transform points
    const bridgeMatrix = bridgeObject.matrixWorld.clone();
    const bridgeInverseMatrix = new THREE.Matrix4().copy(bridgeMatrix).invert();
    
    // Transform player position to bridge's local space
    const localPosition = position.clone().applyMatrix4(bridgeInverseMatrix);
    
    // Get dimensions from geometry
    let width, height, depth;
    if (bridgeObject.geometry && bridgeObject.geometry.parameters) {
      width = bridgeObject.geometry.parameters.width || 1;
      height = bridgeObject.geometry.parameters.height || 1;
      depth = bridgeObject.geometry.parameters.depth || 1;
    } else {
      // Fallback if parameters not available
      const box = new THREE.Box3().setFromObject(bridgeObject);
      const size = new THREE.Vector3();
      box.getSize(size);
      width = size.x;
      height = size.y;
      depth = size.z;
    }
    
    // In local coordinates of the bridge, bounds are simple
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfDepth = depth / 2;
    
    // Allow standing on top of the bridge collider for smoother movement
    if (localPosition.y > halfHeight && 
        Math.abs(localPosition.x) < halfWidth && 
        Math.abs(localPosition.z) < halfDepth) {
      return false;
    }
    
    // Check if player is within the collider bounds
    const collisionRadius = playerRadius * 0.9;
    if (Math.abs(localPosition.x) < halfWidth + collisionRadius &&
        Math.abs(localPosition.y) < halfHeight + collisionRadius &&
        Math.abs(localPosition.z) < halfDepth + collisionRadius) {
      
      // Special case for the top surface
      const distToTop = localPosition.y - halfHeight;
      if (distToTop > -0.2 && distToTop < collisionRadius) {
        return false;  // Allow walking on top
      }
      
      return true;  // Collision with sides or bottom
    }
    
    return false;
  } catch (error) {
    console.error("Bridge collider collision error:", error);
    return false;
  }
}

/**
 * Performs accurate collision detection with a bridge hitbox
 * @param {THREE.Vector3} position - Player position
 * @param {THREE.Mesh} bridgeObject - Bridge hitbox mesh
 * @returns {boolean} Whether collision occurred
 */
function checkBridgeCollision(position, bridgeObject) {
  try {
    // Get the bridge's world matrix to transform points
    const bridgeMatrix = bridgeObject.matrixWorld.clone();
    const bridgeInverseMatrix = new THREE.Matrix4().copy(bridgeMatrix).invert();
    
    // Transform player position to bridge's local space
    const localPosition = position.clone().applyMatrix4(bridgeInverseMatrix);
    
    // Get dimensions from geometry safely
    let width, height, depth;
    if (bridgeObject.geometry && bridgeObject.geometry.parameters) {
      width = bridgeObject.geometry.parameters.width || 1;
      height = bridgeObject.geometry.parameters.height || 1;
      depth = bridgeObject.geometry.parameters.depth || 1;
    } else {
      // Fallback if parameters not available
      const box = new THREE.Box3().setFromObject(bridgeObject);
      const size = new THREE.Vector3();
      box.getSize(size);
      width = size.x;
      height = size.y;
      depth = size.z;
    }
    
    // In local coordinates of the bridge, bounds are simple
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfDepth = depth / 2;
    
    // Special case: If we're above the bridge and within its XZ boundaries, don't collide
    // This allows us to walk on top of the bridge
    if (localPosition.y > halfHeight && 
        Math.abs(localPosition.x) < halfWidth && 
        Math.abs(localPosition.z) < halfDepth) {
      return false;
    }
    
    // Standard collision check with adjusted radius
    const collisionRadius = playerRadius * 0.9;
    
    // Check if player is within the bridge bounds (considering radius)
    // Fixed the missing upper bound check for z-coordinate
    if (localPosition.x > -halfWidth - collisionRadius && 
        localPosition.x < halfWidth + collisionRadius &&
        localPosition.y > -halfHeight - collisionRadius && 
        localPosition.y < halfHeight + collisionRadius &&
        localPosition.z > -halfDepth - collisionRadius && 
        localPosition.z < halfDepth + collisionRadius) {
      
      // Calculate distance to the top face of the bridge
      const distToTop = localPosition.y - halfHeight;
      
      // If we're very close to the top surface, don't count as collision
      // This allows for smoother walking on the bridge
      if (distToTop > -0.2 && distToTop < collisionRadius) {
        return false;
      }
      
      // For other faces, collision applies
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Bridge collision error:", error);
    return false;
  }
}

// Add a dedicated function to detect standing on bridges
function checkBridgeSurface(feetPosition, bridgeObject) {
  try {
    // Handle specialized bridge colliders
    if (bridgeObject.userData && bridgeObject.userData.isBridgeCollider) {
      return checkBridgeColliderSurface(feetPosition, bridgeObject);
    }
    
    // Get the bridge's world matrix to transform points
    const bridgeMatrix = bridgeObject.matrixWorld.clone();
    const bridgeInverseMatrix = new THREE.Matrix4().copy(bridgeMatrix).invert();
    
    // Transform feet position to bridge's local space
    const localPosition = feetPosition.clone().applyMatrix4(bridgeInverseMatrix);
    
    // Get bridge dimensions
    let width, height, depth;
    if (bridgeObject.geometry.parameters) {
      width = bridgeObject.geometry.parameters.width;
      height = bridgeObject.geometry.parameters.height;
      depth = bridgeObject.geometry.parameters.depth;
    } else {
      const box = new THREE.Box3().setFromObject(bridgeObject);
      const size = new THREE.Vector3();
      box.getSize(size);
      width = size.x;
      height = size.y;
      depth = size.z;
    }
    
    // In local coordinates of the bridge, bounds are simple
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfDepth = depth / 2;
    
    // Check if feet are directly above the bridge and close to its surface
    const isOnBridge = Math.abs(localPosition.x) < halfWidth &&
                       Math.abs(localPosition.z) < halfDepth &&
                       Math.abs(localPosition.y - halfHeight) < 2.0; // Within 2 units of the top surface
    
    if (isOnBridge) {
      // Transform the top surface position back to world space to get the correct Y
      const topLocalPos = new THREE.Vector3(localPosition.x, halfHeight, localPosition.z);
      const worldPos = topLocalPos.applyMatrix4(bridgeMatrix);
      
      return {
        isOnBridge: true, 
        surfaceY: worldPos.y
      };
    }
    
    return { isOnBridge: false };
  } catch (error) {
    console.error("Bridge surface check error:", error);
    return { isOnBridge: false };
  }
}

/**
 * Special handling for bridge colliders created in bridgeUtils.js
 */
function checkBridgeColliderSurface(feetPosition, bridgeObject) {
  try {
    // Get the bridge's world matrix to transform points
    const bridgeMatrix = bridgeObject.matrixWorld.clone();
    const bridgeInverseMatrix = new THREE.Matrix4().copy(bridgeMatrix).invert();
    
    // Transform feet position to bridge's local space
    const localPosition = feetPosition.clone().applyMatrix4(bridgeInverseMatrix);
    
    // Get dimensions safely
    let width, height, depth;
    if (bridgeObject.geometry && bridgeObject.geometry.parameters) {
      width = bridgeObject.geometry.parameters.width || 1;
      height = bridgeObject.geometry.parameters.height || 1;
      depth = bridgeObject.geometry.parameters.depth || 1;
    } else {
      const box = new THREE.Box3().setFromObject(bridgeObject);
      const size = new THREE.Vector3();
      box.getSize(size);
      width = size.x;
      height = size.y;
      depth = size.z;
    }
    
    // In local coordinates of the bridge, bounds are simple
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfDepth = depth / 2;
    
    // Check if feet are directly above the bridge and close to its surface
    const isOnBridge = Math.abs(localPosition.x) < halfWidth &&
                       Math.abs(localPosition.z) < halfDepth &&
                       Math.abs(localPosition.y - halfHeight) < 2.0;
    
    if (isOnBridge) {
      // Transform the top surface position back to world space
      const topLocalPos = new THREE.Vector3(localPosition.x, halfHeight, localPosition.z);
      const worldPos = topLocalPos.applyMatrix4(bridgeMatrix);
      
      return {
        isOnBridge: true,
        surfaceY: worldPos.y
      };
    }
    
    return { isOnBridge: false };
  } catch (error) {
    console.error("Bridge collider surface check error:", error);
    return { isOnBridge: false };
  }
}

function animatePlayer() {
  animationFrameId = requestAnimationFrame(animatePlayer);

  // Skip physics updates if paused
  if (isPaused) {
    // Update text orientations even when paused
    updateTextOrientations();
    renderer.render(scene, camera);
    return;
  }

  const delta = clock.getDelta();
  
  // Clamp delta to prevent large jumps that could cause crashes
  const clampedDelta = Math.min(delta, 0.1);
  
  // Apply friction to horizontal movement
  velocity.x -= velocity.x * 10.0 * clampedDelta;
  velocity.z -= velocity.z * 10.0 * clampedDelta;

  // Calculate movement direction
  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  // Debug logging for movement
  if (moveLeft || moveRight || moveForward || moveBackward) {
    console.log('Movement states:', { moveLeft, moveRight, moveForward, moveBackward });
    console.log('Direction calculated:', { x: direction.x, z: direction.z });
    console.log('Velocity before application:', { x: velocity.x, z: velocity.z });
  }

  // Apply movement forces
  const speed = 400.0;
  if (moveForward || moveBackward) velocity.z -= direction.z * speed * clampedDelta;
  if (moveLeft || moveRight) velocity.x -= direction.x * speed * clampedDelta;

  // Debug logging after force application
  if (moveLeft || moveRight || moveForward || moveBackward) {
    console.log('Velocity after forces:', { x: velocity.x, z: velocity.z });
  }

  // Apply gravity
  velocity.y -= gravity * clampedDelta;

  // Get the controls object for consistent movement
  const controlsObject = controls.getObject();
  
  // Safety check to ensure controls object exists
  if (!controlsObject) {
    renderer.render(scene, camera);
    return;
  }
  
  // Store original position for collision rollback
  const originalPosition = controlsObject.position.clone();
  
  // Apply horizontal movement
  controls.moveRight(-velocity.x * clampedDelta);
  controls.moveForward(-velocity.z * clampedDelta);
  
  // Check collision after horizontal movement
  if (checkCollision(controlsObject.position)) {
    // Rollback if collision detected
    controlsObject.position.copy(originalPosition);
    // Add a small push-away vector from collision to prevent sticking
    velocity.x *= -0.2;
    velocity.z *= -0.2;
  }
  
  // Apply vertical movement
  controlsObject.position.y += velocity.y * clampedDelta;
  
  // Check vertical collision separately for better control
  if (checkCollision(controlsObject.position)) {
    // Vertical collision - check if we're moving up or down
    if (velocity.y > 0) {
      // Hit ceiling - stop upward movement
      velocity.y = 0;
    } else {
      // Hit ground/platform - stop falling
      velocity.y = 0;
      // Restore position to before vertical movement
      controlsObject.position.y = originalPosition.y;
    }
  }

  // Check specifically for floor collision
  let isOnFloor = false;
  let groundY = -Infinity; // Track the highest ground position
  
  for (const object of collidableObjects) {
    try {
      // Special handling for bridge colliders from bridgeUtils.js
      if (object.userData && object.userData.isBridgeCollider) {
        const feetPosition = new THREE.Vector3(
          controlsObject.position.x,
          controlsObject.position.y - playerHeight,
          controlsObject.position.z
        );
        
        const bridgeResult = checkBridgeColliderSurface(feetPosition, object);
        
        if (bridgeResult.isOnBridge) {
          isOnFloor = true;
          
          if (bridgeResult.surfaceY > groundY) {
            groundY = bridgeResult.surfaceY;
          }
        }
        
        continue;
      }
      
      // Special handling for bridge surfaces
      if (object.userData && (object.userData.type === 'bridgeHitbox' || object.userData.bridgeHitbox === true)) {
        // Calculate feet position
        const feetPosition = new THREE.Vector3(
          controlsObject.position.x,
          controlsObject.position.y - playerHeight,
          controlsObject.position.z
        );
        
        // Check if standing on bridge
        const bridgeResult = checkBridgeSurface(feetPosition, object);
        
        if (bridgeResult.isOnBridge) {
          isOnFloor = true;
          
          // Bridge top surface might be higher than current ground
          if (bridgeResult.surfaceY > groundY) {
            groundY = bridgeResult.surfaceY;
          }
        }
      }
      
      // Special handling for cylinders as standing surfaces
      if (object.geometry instanceof THREE.CylinderGeometry) {
        const cylinderPosition = object.position.clone();
        const radius = object.geometry.parameters.radiusTop;
        const cylinderHeight = object.geometry.parameters.height;
        const cylinderTop = cylinderPosition.y + cylinderHeight / 2;
        
        // Check if player is above the cylinder
        const horizontalPosition = controlsObject.position.clone();
        horizontalPosition.y = 0;
        
        const horizontalCylinderPosition = cylinderPosition.clone();
        horizontalCylinderPosition.y = 0;
        
        // Get horizontal distance to cylinder center
        const distance = horizontalPosition.distanceTo(horizontalCylinderPosition);
        
        // If player is above the cylinder and close to its top surface
        if (distance < radius && 
            Math.abs(controlsObject.position.y - playerHeight - cylinderTop) < 2.0) {
          isOnFloor = true;
          
          if (cylinderTop > groundY) {
            groundY = cylinderTop;
          }
        }
      }
      // Regular floor detection for other objects
      else if (object.geometry) {
        // Get object bounds
        const objectBox = new THREE.Box3().setFromObject(object);
        
        // Use a larger sphere for more stable floor detection
        const feetPosition = new THREE.Vector3(
          controlsObject.position.x,
          controlsObject.position.y - playerHeight * 0.9,
          controlsObject.position.z
        );
        const feetBounds = new THREE.Sphere(feetPosition, 1.0);
        
        // Check for collision with feet
        if (objectBox.intersectsSphere(feetBounds)) {
          // Check if we're above the object's top surface (with a small margin)
          const objectTop = objectBox.max.y;
          const playerBottomY = controlsObject.position.y - playerHeight;
          
          if (playerBottomY >= objectTop - 2.0) { // 2.0 is a tolerance margin
            isOnFloor = true;
            
            // Find the highest ground to stand on
            if (objectTop > groundY) {
              groundY = objectTop;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in floor detection:", error);
      // Continue checking other objects even if one fails
      continue;
    }
  }
  
  // If we're on a floor, snap to the correct height
  if (isOnFloor) {
    // Only adjust position if we're falling or very close to the ground
    if (velocity.y <= 0) {
      velocity.y = 0;
      // Position exactly at playerHeight above the ground
      controlsObject.position.y = groundY + playerHeight;
    }
  }

  // Only allow jumping when on floor and not already jumping
  canJump = isOnFloor && velocity.y <= 0;

  // Reset jump count when on floor
  if (isOnFloor) {
    jumpCount = 0;
  }

  // Update player collider position if needed
  if (playerCollider) {
    // Make the collider always visible through objects
    playerCollider.renderOrder = 999;
    playerCollider.material.depthTest = false;
  }

  // Update text orientations to face camera
  updateTextOrientations();

  // Render the scene
  renderer.render(scene, camera);
}

/**
 * Update text orientations to always face the camera
 */
function updateTextOrientations() {
  if (window.textMeshes && camera) {
    window.textMeshes.forEach(textMesh => {
      if (textMesh && textMesh.parent) {
        // Get world position of text
        const worldPosition = new THREE.Vector3();
        textMesh.getWorldPosition(worldPosition);
        
        // Make text look at camera
        textMesh.lookAt(camera.position);
        
        // Prevent text from being upside down
        textMesh.rotation.x = 0;
        textMesh.rotation.z = 0;
      }
    });
  }
}