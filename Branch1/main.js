import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createSimpleCylinder } from './cylinderUtils.js';
import { connectCylindersWithBridge, createCylinderNetwork } from './bridgeUtils.js';
import { toggleHitboxVisibility } from './hitboxUtils.js';
import { getChildrenOfNode, getChildrenKeysOfNode, hasChildren } from './nodeUtils.js';
import { iterateDictionary } from './WorldGenerator.js';

// Scene setup
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });
export const controls = new PointerLockControls(camera, document.body);
export const collidableObjects = [];

// Player settings - moved from player.js to avoid circular dependencies
export const playerHeight = 10;
export const playerRadius = 2;

// Initialize the scene
init();

function init() {
  console.log("Initializing scene");
  
  // Configure renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  
  // Set up camera and controls
  camera.position.set(0, playerHeight, 0);
  scene.add(controls.getObject());
  
  // Test nodeUtils functions
  testNodeUtils();
  
  // Lighting
  setupLights();
  
  // Create level
  createLevel();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Set up pointer lock controls
  setupPointerLock();
  
  // Add key listener for hitbox toggling
  window.addEventListener('keydown', onKeyDown);
  
  // Import and set up player AFTER scene is ready to avoid circular dependencies
  import('./player.js').then(playerModule => {
    playerModule.setupPlayer();
    console.log("Player setup complete");
    
    // Start rendering
    animate();
  }).catch(error => {
    console.error("Error loading player module:", error);
  });
}

// Function to test nodeUtils module
function testNodeUtils() {
  console.log("--- Testing nodeUtils.js functions ---");
  
  // Create a sample nested dictionary
  const testDict = {
    level1: {
      item1: "value1",
      item2: "value2",
      nested: {
        nestedItem1: 100,
        nestedItem2: 200
      }
    },
    level2: {
      itemA: [1, 2, 3],
      itemB: { x: 10, y: 20 }
    },
    emptyNode: {}
  };
  
  // Test 1: Get children with direct key
  const level1Children = getChildrenOfNode(testDict, 'level1');
  console.log("Children of 'level1':", level1Children);
  
  // Test 2: Get children with path array
  const nestedChildren = getChildrenOfNode(testDict, ['level1', 'nested']);
  console.log("Children of ['level1', 'nested']:", nestedChildren);
  
  // Test 3: Get only child keys
  const level2Keys = getChildrenKeysOfNode(testDict, 'level2');
  console.log("Keys of 'level2':", level2Keys);
  
  // Test 4: Check if nodes have children
  console.log("Does 'level1' have children?", hasChildren(testDict, 'level1'));
  console.log("Does 'emptyNode' have children?", hasChildren(testDict, 'emptyNode'));
  console.log("Does non-existent node have children?", hasChildren(testDict, 'nonExistent'));
  
  console.log("--- End of nodeUtils test ---");
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function setupLights() {
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);
  
  // Directional light (sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(50, 100, 50);
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

function createLevel() {
  // Materials
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x808080,
    roughness: 0.8 
  });
  
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.7 
  });
  
  const cylinderMaterial = new THREE.MeshStandardMaterial({
    color: 0x4682B4,
    roughness: 0.6
  });
  
  const bridgeMaterial = new THREE.MeshStandardMaterial({
    color: 0xA0522D,
    roughness: 0.5
  });
  
  // Floor
  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);
  collidableObjects.push(floor);
  
  // Create cylinders and store references
  const cylinder1 = createSimpleCylinder(-60, 50, 30, 60, cylinderMaterial);
  const cylinder2 = createSimpleCylinder(60, 7.5, -60, 20, cylinderMaterial);
  const cylinder3 = createSimpleCylinder(90, 5, 90, 20, cylinderMaterial);
  
  // Method 1: Connect two specific cylinders with a bridge
  connectCylindersWithBridge(
    cylinder1,
    cylinder2,
    20,    // bridge width
    1,    // bridge thickness
    0,    // height offset (from cylinder center)
    bridgeMaterial
  );
  
  // Method 2: Create a network of connected cylinders
  const cylinderNetwork = [cylinder2, cylinder3];
  createCylinderNetwork(
    cylinderNetwork,
    8,    // bridge width
    0.8,  // bridge thickness
    1,    // height offset (slightly above center of cylinders)
    bridgeMaterial
  );
}

function createWall(x, y, z, width, height, depth, material) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const wall = new THREE.Mesh(geometry, material);
  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  collidableObjects.push(wall);
  return wall;
}

function setupPointerLock() {
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.color = '#fff';
  overlay.style.fontSize = '24px';
  overlay.style.zIndex = '100';
  overlay.innerHTML = '<p>Click to play</p><p>WASD = Move, SPACE = Jump, MOUSE = Look around</p>';
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', function() {
    controls.lock();
  });
  
  controls.addEventListener('lock', function() {
    overlay.style.display = 'none';
  });
  
  controls.addEventListener('unlock', function() {
    overlay.style.display = 'flex';
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle keyboard input
function onKeyDown(event) {
  // Toggle hitbox visibility with 'H' key
  if (event.key === 'h' || event.key === 'H') {
    toggleHitboxVisibility();
  }
}

// Sample dictionary structure
const worldStructure = {
  "main": {
    "branch1": {
      "node1": {},
      "node2": {
        "material.h" : "wood",
      }
    },
    "branch2": {
      "node3": {}
    }
  }
};

// Define a callback to process each node
function processNode(key, value, radius) {
  console.log(`Processing node: ${key}, radius: ${radius}`);
  return { key, value, radius };
}

// Execute the world generator
const result = iterateDictionary(worldStructure);
console.log("file:", worldStructure);
console.log("Generated world structure:", result);

load_map(result.connections[0]);

function load_map(map){
  const location = map.location;
  location.z = location.z;
  location.y = location.y;
  const radius = map.radius;

  // console.log("Loading map at location:", location, "with radius:", radius);
  
  const body = createSimpleCylinder(
    location.x,
    location.z,
    location.y,
    radius,
  );

  console.log("body:", location);
  // console.log("connections:", map.connections);
  for (const elem in map.connections) {
      const son = load_map(map.connections[elem]);
      connectCylindersWithBridge(
        body,
        son,
        20,    // bridge width
        1,    // bridge thickness
        0,    // height offset (from cylinder center)
        new THREE.MeshStandardMaterial({
          color: 0xA0522D,
          roughness: 0.5
        })
      );
  }

  return body;

}

