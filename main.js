import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createSimpleCylinder } from './cylinderUtils.js';
import { connectCylindersWithBridge, createCylinderNetwork, clearBridgeTracking } from './bridgeUtils.js';
import { toggleHitboxVisibility } from './hitboxUtils.js';
import { getChildrenOfNode, getChildrenKeysOfNode, hasChildren } from './nodeUtils.js';
import { initializeLighting, toggleDayNight, getIsNightMode } from './dayNightCycle.js';

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
let rootNodePosition = { x: 0, y: playerHeight, z: 0 }; // Track root node position

// Initialize the scene
init();

function init() {
  console.log("Initializing scene");
  
  // Configure renderer with simpler settings
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);
  
  // Set up camera and controls
  camera.position.set(0, playerHeight, 0);
  scene.add(controls.getObject());
  
  // Test nodeUtils functions
  testNodeUtils();
  
  // Initialize lighting system
  initializeLighting();
  
  // Set up file upload functionality
  setupFileUpload();
  
  // Create level using NEW system
  createLevelWithSpreader();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Set up pointer lock controls
  setupPointerLock();
  
  // Add key listener for hitbox toggling and day/night toggle
  window.addEventListener('keydown', onKeyDown);
  
  // Expose reset function globally for pause menu access
  window.resetToDefaultWorld = resetToDefaultWorld;
  
  // Expose root node position globally
  window.rootNodePosition = rootNodePosition;
  
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

// Handle keyboard input
function onKeyDown(event) {
  // Toggle hitbox visibility with 'H' key
  if (event.key === 'h' || event.key === 'H') {
    toggleHitboxVisibility();
  }
  
  // Toggle day/night with 'N' key
  if (event.key === 'n' || event.key === 'N') {
    const targetNight = toggleDayNight();
    if (targetNight !== null) {
      showMessage(`Transitioning to ${targetNight ? 'Night' : 'Day'} mode...`, 'info');
    } else {
      showMessage('Transition already in progress', 'info');
    }
  }
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
  // Clear existing world objects and their lights
  const objectsToRemove = [];
  const lightsToRemove = [];
  
  scene.traverse((child) => {
    // Remove cylinders, bridges, and other world objects but keep lights and skybox
    if (child.isMesh && 
        child.geometry && 
        (child.geometry.type === 'CylinderGeometry' || 
         child.geometry.type === 'BoxGeometry') &&
        !child.material.uniforms) { // Exclude skybox (has shader uniforms)
      
      // Remove associated lights
      if (child.userData.lights) {
        child.userData.lights.forEach(light => lightsToRemove.push(light));
      }
      
      objectsToRemove.push(child);
    }
    
    // Also remove orphaned point lights
    if (child.isLight && child.type === 'PointLight') {
      lightsToRemove.push(child);
    }
  });

  objectsToRemove.forEach(obj => {
    scene.remove(obj);
    const index = collidableObjects.indexOf(obj);
    if (index > -1) {
      collidableObjects.splice(index, 1);
    }
  });
  
  // Remove all point lights
  lightsToRemove.forEach(light => {
    scene.remove(light);
  });

  // Clear bridge tracking data for fresh start
  clearBridgeTracking();

  // Clear text meshes tracking
  if (window.textMeshes) {
    window.textMeshes.length = 0;
  }

  // Generate new world with custom data first to get root position
  createLevelWithSpreader();
  
  // Reset player position to root node position
  if (controls.getObject) {
    const controlsObject = controls.getObject();
    controlsObject.position.set(rootNodePosition.x, rootNodePosition.y, rootNodePosition.z);
    
    // Reset camera rotation
    camera.rotation.set(0, 0, 0);
    
    // Reset velocity if player module is loaded
    if (window.resetPlayerState) {
      window.resetPlayerState();
    }
  }
  
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
        load_map(layoutData, true); // Mark as root node
    } else {
        console.error("Failed to generate layout data using Spreader2.");
    }
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
function load_map(mapNode, isRoot = false) {
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

  // Update root node position if this is the root node or if not set yet
  if (isRoot || rootNodePosition.x === 0 && rootNodePosition.y === playerHeight && rootNodePosition.z === 0) {
    rootNodePosition = {
      x: threeX,
      y: threeY_height + radius + playerHeight, // Position above the cylinder surface
      z: threeZ
    };
    console.log("Root node position set to:", rootNodePosition);
  }

  console.log(`Loading map node: ${mapNode.name || 'Unnamed'}, Radius: ${radius}`);
  
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

  // Add text label to the cylinder with description
  if (body) {
    // Store mapNode data in cylinder userData for description access
    body.userData.mapNode = mapNode;
    addTextToCylinder(body, mapNode.name || mapNode.id || 'Node', radius);
  }

  if (mapNode.connections && mapNode.connections.length > 0) {
    for (const childNode of mapNode.connections) {
        const childBody = load_map(childNode, false); // Recursive call, not root
        if (body && childBody) {
            connectCylindersWithBridge(
                body,
                childBody,
                Math.max(radius / 4, 8),
                1.5,
                0,
                new THREE.MeshStandardMaterial({ color: 0xA0522D, roughness: 0.7 })
            );
        }
    }
  }
  return body;
}

function addTextToCylinder(cylinder, text, cylinderRadius) {
  // Create canvas for text texture
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Set canvas size based on text length and cylinder size
  const canvasSize = Math.max(320, cylinderRadius * 12);
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  
  // Configure text styling for main label
  const mainFontSize = Math.max(20, cylinderRadius * 2);
  
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Add background
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add border
  context.strokeStyle = '#333333';
  context.lineWidth = 4;
  context.strokeRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  context.font = `bold ${mainFontSize}px Arial, sans-serif`;
  context.fillStyle = '#333333';
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // Create material for the text
  const textMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
  });
  
  // Create geometry for the text plane
  const textGeometry = new THREE.PlaneGeometry(cylinderRadius * 2, cylinderRadius * 2);
  
  // Create text mesh
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  
  // Position the text above the cylinder
  textMesh.position.set(0, cylinderRadius + 20, 0);
  
  // Make text always face the camera
  textMesh.userData.isText = true;
  
  // Add text to cylinder as a child
  cylinder.add(textMesh);
  
  console.log(`Added text label "${text}" to cylinder`);
}