import * as THREE from 'three';
import { scene, collidableObjects } from './main.js';
import { createVisibleHitbox } from './hitboxUtils.js';

// Global tracking for bridge collision detection
const bridgeTracker = new Map(); // Maps cylinder IDs to their bridges

/**
 * Creates a bridge connecting two cylinders at their edges, handling different heights
 * @param {THREE.Mesh} cylinder1 - First cylinder
 * @param {THREE.Mesh} cylinder2 - Second cylinder
 * @param {number} bridgeWidth - Width of the bridge
 * @param {number} bridgeThickness - Thickness/height of the bridge
 * @param {number} bridgeHeightOffset - Height offset from cylinder edge (0 for edge alignment)
 * @param {THREE.Material} material - Material for the bridge
 * @param {boolean} isCollidable - Whether the bridge should be collidable
 * @returns {THREE.Mesh} - The created bridge
 */
export function connectCylindersWithBridge(
  cylinder1,
  cylinder2,
  bridgeWidth,
  bridgeThickness,
  bridgeHeightOffset,
  material,
  isCollidable = true
) {
  if (!cylinder1 || !cylinder2) {
    console.error("connectCylindersWithBridge: Invalid cylinder objects provided");
    return null;
  }

  // Get cylinder IDs for tracking
  const cylinder1Id = cylinder1.uuid;
  const cylinder2Id = cylinder2.uuid;
  
  // Initialize bridge tracking for cylinders if not exists
  if (!bridgeTracker.has(cylinder1Id)) {
    bridgeTracker.set(cylinder1Id, []);
  }
  if (!bridgeTracker.has(cylinder2Id)) {
    bridgeTracker.set(cylinder2Id, []);
  }

  // Get cylinder centers
  const center1 = new THREE.Vector3().copy(cylinder1.position);
  const center2 = new THREE.Vector3().copy(cylinder2.position);
  
  // Calculate horizontal direction (ignoring y-component for initial calculation)
  const horizontalDirection = new THREE.Vector3(
    center2.x - center1.x,
    0,
    center2.z - center1.z
  ).normalize();
  
  // Get cylinder radiuses by examining the geometry
  const cylinder1Radius = getCylinderRadius(cylinder1);
  const cylinder2Radius = getCylinderRadius(cylinder2);
  
  // Calculate points on cylinder edges (border)
  const point1 = new THREE.Vector3()
    .copy(center1)
    .add(new THREE.Vector3(
      horizontalDirection.x * cylinder1Radius,
      0,
      horizontalDirection.z * cylinder1Radius
    ));
  
  const point2 = new THREE.Vector3()
    .copy(center2)
    .add(new THREE.Vector3(
      -horizontalDirection.x * cylinder2Radius,
      0, 
      -horizontalDirection.z * cylinder2Radius
    ));
  
  // Adjust height with the offset
  point1.y += bridgeHeightOffset;
  point2.y += bridgeHeightOffset;
  
  // Calculate actual 3D direction for the bridge
  const bridgeDirection = new THREE.Vector3().subVectors(point2, point1).normalize();
  
  // Calculate bridge length (actual 3D distance between points)
  const bridgeLength = point1.distanceTo(point2);
  
  // Create bridge geometry
  const bridgeGeometry = new THREE.BoxGeometry(bridgeLength, bridgeThickness, bridgeWidth);
  
  // Create bridge mesh
  const bridge = new THREE.Mesh(bridgeGeometry, material);
  
  // Position bridge at midpoint between cylinder edges
  const midpoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
  bridge.position.copy(midpoint);
  
  // SIMPLEST ORIENTATION APPROACH:
  // Create a temporary Object3D to handle the orientation calculation
  const orientationHelper = new THREE.Object3D();
  scene.add(orientationHelper);
  
  // Position it at midpoint
  orientationHelper.position.copy(midpoint);
  
  // Create a direction vector from point1 to point2
  const direction = new THREE.Vector3().subVectors(point2, point1);
  
  // Calculate world up vector
  const worldUp = new THREE.Vector3(0, 1, 0);
  
  // Create a matrix to align the bridge along the direction
  const matrix = new THREE.Matrix4();
  
  // X axis is along the direction from point1 to point2
  const xAxis = direction.clone().normalize();
  
  // Y axis should be aligned with world up as much as possible
  const yAxis = worldUp.clone();
  
  // Z axis is perpendicular to both X and world up
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  
  // Recompute Y to ensure orthogonality
  yAxis.crossVectors(zAxis, xAxis).normalize();
  
  // Set the rotation matrix
  matrix.makeBasis(xAxis, yAxis, zAxis);
  
  // Apply the rotation to the bridge
  bridge.quaternion.setFromRotationMatrix(matrix);
  
  // Remove the helper
  scene.remove(orientationHelper);
  
  // Add bridge to scene
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  scene.add(bridge);
  
  // Create visible hitbox
  createVisibleHitbox(bridge, 0xff0000);
  
  // Create specialized collision boxes for inclined bridges
  if (isCollidable) {
    createCollisionBoxesForBridge(bridge, bridgeLength, bridgeThickness, bridgeWidth, point1, point2);
  }

  // Store bridge information for collision tracking
  const bridgeInfo = {
    bridge: bridge,
    startPoint: point1.clone(),
    endPoint: point2.clone(),
    width: bridgeWidth,
    height: bridgeThickness,
    direction: bridgeDirection.clone().normalize(),
    angle: calculateOptimalConnectionPoint(cylinder1, point2, bridgeWidth, cylinder1Id).angle
  };
  
  // Add to tracking
  bridgeTracker.get(cylinder1Id).push(bridgeInfo);
  bridgeTracker.get(cylinder2Id).push(bridgeInfo);
  
  return bridge;
}

/**
 * Helper function to get the radius of a cylinder mesh
 * @param {THREE.Mesh} cylinder - The cylinder mesh
 * @returns {number} - The radius of the cylinder
 */
function getCylinderRadius(cylinder) {
  // Try to get radius from geometry
  if (cylinder.geometry instanceof THREE.CylinderGeometry) {
    return cylinder.geometry.parameters.radiusTop;
  }
  
  // Fallback to estimating radius from bounding sphere
  cylinder.geometry.computeBoundingSphere();
  const boundingSphere = cylinder.geometry.boundingSphere;
  
  // For cylinders, we can use the bounding sphere radius but need to account for the height
  const height = cylinder.geometry.parameters?.height || boundingSphere.radius * 2;
  const scale = cylinder.scale.x; // Assuming uniform scaling
  
  // Approximate radius considering the bounding sphere includes height
  return Math.min(boundingSphere.radius * scale * 0.7, height * 0.5);
}

/**
 * Creates specialized collision boxes for an inclined bridge
 * @param {THREE.Mesh} bridge - The bridge mesh
 * @param {number} length - Length of the bridge
 * @param {number} height - Height/thickness of the bridge
 * @param {number} width - Width of the bridge
 * @param {THREE.Vector3} startPoint - The starting point of the bridge
 * @param {THREE.Vector3} endPoint - The ending point of the bridge
 */
function createCollisionBoxesForBridge(bridge, length, height, width, startPoint, endPoint) {
  // Calculate the height difference for incline detection
  const heightDiff = Math.abs(startPoint.y - endPoint.y);
  const isSignificantlyInclined = heightDiff > height;
  
  // Determine how many segments to create based on length and steepness
  // Use more segments for steeper bridges
  const numSegments = Math.max(
    Math.ceil(length / 5), // More segments per unit length (was 8)
    Math.ceil(heightDiff / 2) // More segments per unit of height difference (was 3)
  );
  
  // Use more segments for steep inclines, fewer for gentle slopes
  const segmentLength = length / numSegments;
  
  // Create direction vector for placing segments
  const bridgeDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
  
  // Create a smoother mesh of collision boxes - make them shorter and overlap more
  for (let i = 0; i < numSegments; i++) {
    // Calculate position for this segment (offset from bridge start)
    const offset = (i + 0.5) * segmentLength;
    const segmentPosition = new THREE.Vector3()
      .copy(startPoint)
      .addScaledVector(bridgeDirection, offset);
    
    // Adjust segment size - MORE overlap for even smoother transitions
    const segmentSize = {
      length: segmentLength * 1.4, // More overlap (increased from 1.2 to 1.4)
      height: isSignificantlyInclined ? height * 0.7 : height * 0.9, // Thinner for better step detection
      width: width * 0.95 // Slightly narrower for better edge behavior
    };
    
    // Create collision box
    const collisionGeometry = new THREE.BoxGeometry(segmentSize.length, segmentSize.height, segmentSize.width);
    const collisionMaterial = new THREE.MeshBasicMaterial({
      visible: false
    });
    
    const collisionBox = new THREE.Mesh(collisionGeometry, collisionMaterial);
    
    // Position at segment location
    collisionBox.position.copy(segmentPosition);
    
    // Use same rotation as the bridge
    collisionBox.quaternion.copy(bridge.quaternion);
    
    // Add to scene
    scene.add(collisionBox);
    
    // Add extended data to help with collisions
    collisionBox.userData.isBridgeCollider = true;
    collisionBox.userData.parentBridge = bridge;
    collisionBox.userData.segment = i;
    collisionBox.userData.totalSegments = numSegments;
    collisionBox.userData.inclineAngle = Math.atan2(heightDiff, length) * (180/Math.PI);
    collisionBox.userData.segmentStart = i * segmentLength;
    collisionBox.userData.segmentEnd = (i + 1) * segmentLength;
    collisionBox.userData.bridgeStart = startPoint.clone();
    collisionBox.userData.bridgeEnd = endPoint.clone();
    
    // Add to collidable objects
    collidableObjects.push(collisionBox);
    
    // Create visible hitbox for debugging - different colors for segments
    const hue = (i / numSegments) * 0.3 + 0.1; // Range from 0.1 to 0.4 (yellow to green)
    const color = new THREE.Color().setHSL(hue, 1, 0.5);
    const hitbox = createVisibleHitbox(collisionBox, color.getHex());
    
    // Add extra downward extension to help with smoother transitions at bottom of slopes
    if (i === 0 || i === numSegments - 1) {
      // Create an additional "transition" collider at the ends
      const transitionBox = new THREE.Mesh(
        new THREE.BoxGeometry(segmentSize.length, segmentSize.height * 1.5, segmentSize.width),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      
      // Position slightly below the regular segment
      const transitionPosition = segmentPosition.clone();
      transitionPosition.y -= segmentSize.height * 0.25;
      transitionBox.position.copy(transitionPosition);
      transitionBox.quaternion.copy(bridge.quaternion);
      
      // Add to scene with special transition marker
      scene.add(transitionBox);
      
      // Add extended data to help with collisions
      transitionBox.userData.isBridgeTransition = true;
      transitionBox.userData.isBridgeCollider = true;
      transitionBox.userData.parentBridge = bridge;
      
      // Add to collidable objects
      collidableObjects.push(transitionBox);
      
      // Create visible hitbox for debugging if needed
      const transitionColor = i === 0 ? 0x5555ff : 0x55ff55;
      const hitbox = createVisibleHitbox(transitionBox, transitionColor);
    }
  }
  
  // The bridge itself is not collidable, just a visual
  bridge.userData.isVisualOnly = true;
}

/**
 * Calculate optimal connection point on cylinder edge to avoid bridge overlaps
 */
function calculateOptimalConnectionPoint(fromCylinder, toPosition, bridgeWidth, cylinderId) {
  const fromPos = fromCylinder.position.clone();
  const radius = fromCylinder.geometry ? fromCylinder.geometry.parameters.radiusTop : 10;
  
  // Calculate the direction to the target
  const directionToTarget = new THREE.Vector3().subVectors(toPosition, fromPos);
  directionToTarget.y = 0; // Project onto horizontal plane
  directionToTarget.normalize();
  
  // Calculate the ideal angle for this connection
  const idealAngle = Math.atan2(directionToTarget.z, directionToTarget.x);
  
  // Get existing bridges from this cylinder
  const existingBridges = bridgeTracker.get(cylinderId) || [];
  
  // Find the best angle that avoids collisions
  const finalAngle = findNonCollidingAngle(idealAngle, existingBridges, bridgeWidth, radius);
  
  // Calculate the connection point
  const connectionPoint = new THREE.Vector3(
    fromPos.x + radius * Math.cos(finalAngle),
    fromPos.y,
    fromPos.z + radius * Math.sin(finalAngle)
  );
  
  return {
    point: connectionPoint,
    angle: finalAngle
  };
}

/**
 * Find an angle that doesn't cause bridge collisions
 */
function findNonCollidingAngle(idealAngle, existingBridges, bridgeWidth, cylinderRadius) {
  if (existingBridges.length === 0) {
    return idealAngle;
  }
  
  // Calculate minimum angular separation needed
  // Based on bridge width and cylinder radius
  const minAngularSeparation = Math.asin(bridgeWidth / cylinderRadius) + 0.2; // Add 0.2 radians safety margin
  
  // Collect all existing angles
  const existingAngles = existingBridges.map(bridge => bridge.angle);
  
  // Try the ideal angle first
  if (isAngleClear(idealAngle, existingAngles, minAngularSeparation)) {
    return idealAngle;
  }
  
  // If ideal angle conflicts, try nearby angles
  const maxAttempts = 36; // Check every 10 degrees
  const angleStep = (2 * Math.PI) / maxAttempts;
  
  for (let i = 1; i < maxAttempts; i++) {
    // Try both positive and negative offsets
    const angle1 = idealAngle + (i * angleStep);
    const angle2 = idealAngle - (i * angleStep);
    
    if (isAngleClear(angle1, existingAngles, minAngularSeparation)) {
      console.log(`Bridge angle adjusted by +${(i * angleStep * 180 / Math.PI).toFixed(1)} degrees to avoid collision`);
      return normalizeAngle(angle1);
    }
    
    if (isAngleClear(angle2, existingAngles, minAngularSeparation)) {
      console.log(`Bridge angle adjusted by -${(i * angleStep * 180 / Math.PI).toFixed(1)} degrees to avoid collision`);
      return normalizeAngle(angle2);
    }
  }
  
  // If no clear angle found, use ideal angle with warning
  console.warn("Could not find non-colliding angle for bridge, using ideal angle anyway");
  return idealAngle;
}

/**
 * Check if an angle is clear of existing bridges
 */
function isAngleClear(testAngle, existingAngles, minSeparation) {
  for (const existingAngle of existingAngles) {
    const angleDiff = getAngularDistance(testAngle, existingAngle);
    if (angleDiff < minSeparation) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate the minimum angular distance between two angles
 */
function getAngularDistance(angle1, angle2) {
  const diff = Math.abs(angle1 - angle2);
  return Math.min(diff, 2 * Math.PI - diff);
}

/**
 * Normalize angle to [0, 2π] range
 */
function normalizeAngle(angle) {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
}

/**
 * Clear bridge tracking data (useful for world regeneration)
 */
export function clearBridgeTracking() {
  bridgeTracker.clear();
  console.log("Bridge tracking data cleared");
}

/**
 * Creates a network of connected cylinders with bridges
 * @param {Array<THREE.Mesh>} cylinders - Array of cylinders to connect
 * @param {number} bridgeWidth - Width of the bridges
 * @param {number} bridgeThickness - Thickness/height of the bridges
 * @param {number} bridgeHeightOffset - Height offset from cylinder center
 * @param {THREE.Material} material - Material for the bridges
 * @returns {Array<THREE.Mesh>} - Array of created bridges
 */
export function createCylinderNetwork(
  cylinders,
  bridgeWidth,
  bridgeThickness,
  bridgeHeightOffset,
  material
) {
  const bridges = [];
  
  // Connect each cylinder to the next one in the array
  for (let i = 0; i < cylinders.length - 1; i++) {
    const bridge = connectCylindersWithBridge(
      cylinders[i],
      cylinders[i + 1],
      bridgeWidth,
      bridgeThickness,
      bridgeHeightOffset,
      material
    );
    bridges.push(bridge);
  }
  
  return bridges;
}
