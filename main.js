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

// Global variable to store custom JSON data
let customWorldData = null;

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
  
  // Set up file upload functionality
  setupFileUpload();
  
  // Create level using NEW system
  createLevelWithSpreader();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Set up pointer lock controls
  setupPointerLock();
  
  // Add key listener for hitbox toggling
  window.addEventListener('keydown', onKeyDown);
  
  // Expose reset function globally for pause menu access
  window.resetToDefaultWorld = resetToDefaultWorld;
  
  // Import and set up player AFTER scene is ready to avoid circular dependencies
  import('./player.js').then(playerModule => {
    playerModule.setupPlayer();
    console.log("Player setup complete");
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

function setupFileUpload() {
  const fileInput = document.getElementById('fileInput');

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          console.log('Loaded JSON data:', jsonData);
          
          // Validate the JSON structure
          if (validateJsonStructure(jsonData)) {
            customWorldData = jsonData;
            regenerateWorld();
            // Show success message
            showMessage('World loaded successfully!', 'success');
            
            // Dispatch event to notify that world was reloaded
            document.dispatchEvent(new CustomEvent('worldReloaded', {
              detail: { source: 'upload', data: jsonData }
            }));
          } else {
            showMessage('Invalid JSON structure. Please provide a valid tree structure.', 'error');
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
          showMessage('Error parsing JSON file. Please check the file format.', 'error');
        }
      };
      reader.readAsText(file);
    } else {
      showMessage('Please select a valid JSON file.', 'error');
    }
    
    // Clear the input so the same file can be selected again
    fileInput.value = '';
  });
}

function validateJsonStructure(data) {
  // Check if it's an array with at least one element
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  // Validate the root node structure
  const rootNode = data[0];
  if (!rootNode.id || !rootNode.type || !rootNode.data || !rootNode.data.label) {
    return false;
  }

  // Recursively validate children
  function validateNode(node) {
    if (!node.id || !node.type || !node.data || !node.data.label) {
      return false;
    }

    if (node.children && Array.isArray(node.children)) {
      return node.children.every(child => validateNode(child));
    }

    return true;
  }

  return validateNode(rootNode);
}

function regenerateWorld() {
  // Clear existing world objects (keep skybox and lights)
  const objectsToRemove = [];
  scene.traverse((child) => {
    // Remove cylinders, bridges, and other world objects but keep lights and skybox
    if (child.isMesh && 
        child.geometry && 
        (child.geometry.type === 'CylinderGeometry' || 
         child.geometry.type === 'BoxGeometry') &&
        !child.material.uniforms) { // Exclude skybox (has shader uniforms)
      objectsToRemove.push(child);
    }
  });

  objectsToRemove.forEach(obj => {
    scene.remove(obj);
    // Also remove from collidableObjects array
    const index = collidableObjects.indexOf(obj);
    if (index > -1) {
      collidableObjects.splice(index, 1);
    }
  });

  // Reset player position and velocity properly
  if (controls.getObject) {
    const controlsObject = controls.getObject();
    controlsObject.position.set(0, playerHeight, 0);
    
    // Reset camera rotation
    camera.rotation.set(0, 0, 0);
    
    // Reset velocity if player module is loaded
    if (window.resetPlayerState) {
      window.resetPlayerState();
    }
  }

  // Generate new world with custom data
  createLevelWithSpreader();
  
  console.log('World regenerated with custom JSON data');
}

// New function to create level using the Spreader2 layout
async function createLevelWithSpreader() {
    console.log("Creating level using Spreader2 layout system...");

    // Generate layout data using custom data if available, otherwise use default
    const rawData = customWorldData || undefined; // Let generateFromDefaultFormat use its default
    const layoutData = generateFromDefaultFormat(rawData);

    if (layoutData) {
        console.log("Layout data from Spreader2 received:", layoutData);
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
  overlay.innerHTML = '<p>Click to play</p><p>WASD = Move, SPACE = Jump, MOUSE = Look around</p><p>Press ENTER to start</p><p style="font-size: 18px; margin-top: 20px;">Press ESC anytime to access the pause menu</p>';
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

function resetToDefaultWorld() {
  customWorldData = null;
  regenerateWorld();
  showMessage('World reset to default!', 'success');
  
  // Dispatch event to notify that world was reloaded
  document.dispatchEvent(new CustomEvent('worldReloaded', {
    detail: { source: 'reset', data: null }
  }));
}

function showMessage(text, type = 'info') {
  // Create temporary message overlay
  const messageDiv = document.createElement('div');
  messageDiv.style.position = 'absolute';
  messageDiv.style.top = '20px';
  messageDiv.style.left = '50%';
  messageDiv.style.transform = 'translateX(-50%)';
  messageDiv.style.padding = '10px 20px';
  messageDiv.style.borderRadius = '5px';
  messageDiv.style.color = 'white';
  messageDiv.style.fontSize = '16px';
  messageDiv.style.zIndex = '2000';
  messageDiv.style.pointerEvents = 'none';
  
  // Set color based on type
  switch(type) {
    case 'success':
      messageDiv.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
      break;
    case 'error':
      messageDiv.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
      break;
    default:
      messageDiv.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
  }
  
  messageDiv.textContent = text;
  document.body.appendChild(messageDiv);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 3000);
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

