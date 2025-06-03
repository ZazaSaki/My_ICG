import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createSimpleCylinder } from './cylinderUtils.js';
import { connectCylindersWithBridge, createCylinderNetwork } from './bridgeUtils.js';
import { toggleHitboxVisibility } from './hitboxUtils.js';
import { getChildrenOfNode, getChildrenKeysOfNode, hasChildren } from './nodeUtils.js';

// Import the NEW world generation entry point
import { generateFromDefaultFormat } from './WorldGenerator.js';

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
  
  // Create level using NEW system
  createLevelWithSpreader();
  
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
    
    // Don't call animate() here - player.js handles the render loop
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

function setupLights() {
  // Create sky background with sun
  const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
  const skyboxMaterial = new THREE.ShaderMaterial({
    uniforms: {
      sunPosition: { value: new THREE.Vector3(0.3, 0.7, 0.2).normalize() },
      skyColor: { value: new THREE.Color(0x87CEEB) },
      horizonColor: { value: new THREE.Color(0xB0E0E6) },
      sunColor: { value: new THREE.Color(0xFFFFAA) }
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
        
        // Create gradient from horizon to sky
        float heightFactor = direction.y;
        vec3 baseColor = mix(horizonColor, skyColor, smoothstep(-0.1, 0.5, heightFactor));
        
        // Add sun
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
  
  const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  scene.add(skybox);
  
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);
  
  // Directional light (sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
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

// New function to create level using the Spreader2 layout
async function createLevelWithSpreader() {
    console.log("Creating level using Spreader2 layout system...");

    // Remove the default floor creation - no floor needed
    // const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 });
    // const floorGeometry = new THREE.PlaneGeometry(2000, 2000);
    // const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    // floor.rotation.x = -Math.PI / 2;
    // floor.position.y = -50;
    // floor.receiveShadow = true;
    // scene.add(floor);
    // collidableObjects.push(floor);

    // Generate layout data using the new system from WorldGenerator.js
    const layoutData = generateFromDefaultFormat(); // Uses exampleInput from WorldGenerator.js by default

    if (layoutData) {
        console.log("Layout data from Spreader2 received:", layoutData);
        // The root of the layoutData is the first "main" node.
        load_map(layoutData);
    } else {
        console.error("Failed to generate layout data using Spreader2.");
    }
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
  overlay.innerHTML = '<p>Click to play</p><p>WASD = Move, SPACE = Jump, MOUSE = Look around</p><p>Press ENTER to start</p>';
  document.body.appendChild(overlay);
  
  // Function to start the game
  function startGame() {
    controls.lock();
  }
  
  overlay.addEventListener('click', startGame);
  
  // Add keyboard listener for Enter key
  function handleOverlayKeydown(event) {
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      startGame();
    }
  }
  
  // Add event listener when overlay is visible
  document.addEventListener('keydown', handleOverlayKeydown);
  
  controls.addEventListener('lock', function() {
    overlay.style.display = 'none';
    // Remove the keydown listener when game starts
    document.removeEventListener('keydown', handleOverlayKeydown);
  });
  
  controls.addEventListener('unlock', function() {
    overlay.style.display = 'flex';
    // Re-add the keydown listener when overlay shows again
    document.addEventListener('keydown', handleOverlayKeydown);
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

// load_map function adapted for Spreader2's output
function load_map(mapNode) { // mapNode is a node { location, radius, connections, name, ... }
  if (!mapNode || !mapNode.location) {
    console.warn("load_map: Invalid mapNode received", mapNode);
    return null;
  }

  const location = mapNode.location;
  const radius = mapNode.radius || 10; // Default radius if not specified

  // Coordinate mapping:
  // Spreader2 X -> Three.js X (horizontal)
  // Spreader2 Y -> Three.js Z (horizontal)
  // Spreader2 Z -> Three.js Y (vertical height/depth)
  const threeX = location.x;
  const threeY_height = location.z + 20; // Reduced offset from 50 to 20
  const threeZ = location.y;

  console.log(`Loading map node: ${mapNode.name || 'Unnamed'}, Radius: ${radius}`);
  console.log(`  Spreader Coords: X=${location.x.toFixed(2)}, Y_horiz=${location.y.toFixed(2)}, Z_depth=${location.z.toFixed(2)}`);
  console.log(`  Three.js Coords: X=${threeX.toFixed(2)}, Y_height=${threeY_height.toFixed(2)}, Z_depth=${threeZ.toFixed(2)}`);
  
  const cylinderMaterial = new THREE.MeshStandardMaterial({
    color: Math.random() * 0xffffff, // Random color for differentiation
    roughness: 0.6,
    metalness: 0.1
  });

  const body = createSimpleCylinder(
    threeX,
    threeY_height,
    threeZ,
    radius,
    cylinderMaterial
  );

  if (mapNode.connections && mapNode.connections.length > 0) {
    for (const childNode of mapNode.connections) {
        const childBody = load_map(childNode); // Recursive call
        if (body && childBody) {
            connectCylindersWithBridge(
                body,
                childBody,
                Math.max(radius / 4, 8),    // Reduced bridge width (was radius/3, now radius/4) with minimum 8
                1.5,           // Reduced bridge thickness for more elegant bridges
                0,             // height offset for bridge (relative to cylinder centers)
                new THREE.MeshStandardMaterial({ color: 0xA0522D, roughness: 0.7 })
            );
        }
    }
  }
  return body; // Return the Three.js object for this node
}

