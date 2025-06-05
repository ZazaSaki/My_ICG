import { toggleDayNight, getIsNightMode } from './dayNightCycle.js';
import { toggleFog, isFogEnabled } from './fogEffects.js';
import { toggleAdvancedFog, isAdvancedFogEnabled } from './advancedFogEffects.js';

let pauseMenuOpen = false;
let pauseMenuElement = null;
let currentMenu = 'main'; // Track current menu state

/**
 * Initialize the pause menu
 */
export function initializePauseMenu() {
  createPauseMenuHTML();
  setupPauseMenuEvents();
  console.log('Pause menu initialized');
}

/**
 * Create the pause menu HTML structure
 */
function createPauseMenuHTML() {
  pauseMenuElement = document.createElement('div');
  pauseMenuElement.id = 'pauseMenu';
  pauseMenuElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    font-family: Arial, sans-serif;
  `;
  
  pauseMenuElement.innerHTML = `
    <!-- Main Menu -->
    <div id="mainMenu" style="background: #2c3e50; padding: 30px; border-radius: 10px; min-width: 400px; max-width: 500px;">
      <h2 style="color: #ecf0f1; text-align: center; margin-bottom: 30px;">Game Menu</h2>
      
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <!-- Environment Settings Button -->
        <button id="environmentMenuBtn" style="
          background: #3498db;
          color: white;
          border: none;
          padding: 15px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          transition: background 0.3s;
        ">🌫️ Environment Settings</button>
        
        <!-- World Settings Button -->
        <button id="worldMenuBtn" style="
          background: #e74c3c;
          color: white;
          border: none;
          padding: 15px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          transition: background 0.3s;
        ">🌍 World Settings</button>
        
        <!-- Controls Info Button -->
        <button id="controlsMenuBtn" style="
          background: #f39c12;
          color: white;
          border: none;
          padding: 15px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          transition: background 0.3s;
        ">🎮 Controls</button>
        
        <!-- Create Custom World Button -->
        <button id="createWorldBtn" style="
          background: #9b59b6;
          color: white;
          border: none;
          padding: 15px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          transition: background 0.3s;
          position: relative;
        ">🎨 Create Custom World</button>
        
        <!-- Resume Game Button -->
        <button id="resumeGameBtn" style="
          background: #27ae60;
          color: white;
          border: none;
          padding: 15px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          margin-top: 10px;
          transition: background 0.3s;
        ">▶️ Resume Game</button>
      </div>
    </div>

    <!-- Environment Settings Sub-Menu -->
    <div id="environmentMenu" style="background: #2c3e50; padding: 30px; border-radius: 10px; min-width: 500px; max-width: 700px; display: none;">
      <h2 style="color: #3498db; text-align: center; margin-bottom: 30px;">🌫️ Environment Settings</h2>
      
      <!-- Day/Night Toggle -->
      <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <label style="color: #ecf0f1; font-size: 16px;">Day/Night Cycle:</label>
        <button id="dayNightToggle" style="
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        ">Toggle to Night</button>
      </div>
      
      <!-- Fog Type Selection -->
      <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <label style="color: #ecf0f1; font-size: 16px;">Fog Type:</label>
        <select id="fogTypeSelect" style="
          background: #34495e;
          color: #ecf0f1;
          border: 1px solid #7f8c8d;
          padding: 10px 15px;
          border-radius: 5px;
          font-size: 14px;
          min-width: 200px;
        ">
          <option value="none">No Fog</option>
          <option value="basic">Basic Particle Fog</option>
          <option value="advanced">Advanced Volumetric Fog</option>
        </select>
      </div>
      
      <!-- Fog Density (for advanced fog) -->
      <div id="fogDensityContainer" style="margin-bottom: 20px; display: none;">
        <label style="color: #ecf0f1; font-size: 16px; display: block; margin-bottom: 8px;">Fog Density:</label>
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="range" id="fogDensitySlider" min="0.01" max="0.3" step="0.01" value="0.08" style="flex: 1;">
          <span id="fogDensityValue" style="color: #ecf0f1; font-size: 14px; min-width: 40px;">0.08</span>
        </div>
      </div>
      
      <!-- Light Scattering (for advanced fog) -->
      <div id="lightScatteringContainer" style="margin-bottom: 30px; display: none;">
        <label style="color: #ecf0f1; font-size: 16px; display: block; margin-bottom: 8px;">Light Scattering:</label>
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="range" id="lightScatteringSlider" min="0.1" max="2.0" step="0.1" value="1.0" style="flex: 1;">
          <span id="lightScatteringValue" style="color: #ecf0f1; font-size: 14px; min-width: 40px;">1.0</span>
        </div>
      </div>
      
      <!-- Back Button -->
      <div style="text-align: center;">
        <button id="backToMainFromEnvironment" style="
          background: #7f8c8d;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        ">← Back to Main Menu</button>
      </div>
    </div>

    <!-- World Settings Sub-Menu -->
    <div id="worldMenu" style="background: #2c3e50; padding: 30px; border-radius: 10px; min-width: 500px; max-width: 600px; display: none;">
      <h2 style="color: #e74c3c; text-align: center; margin-bottom: 30px;">🌍 World Settings</h2>
      
      <!-- File Upload -->
      <div style="margin-bottom: 20px;">
        <label style="color: #ecf0f1; font-size: 16px; display: block; margin-bottom: 8px;">Load Custom World:</label>
        <input type="file" id="pauseFileInput" accept=".json" style="
          background: #34495e;
          color: #ecf0f1;
          border: 1px solid #7f8c8d;
          padding: 10px 15px;
          border-radius: 5px;
          width: 100%;
          font-size: 14px;
        ">
        <p style="color: #bdc3c7; font-size: 12px; margin-top: 5px;">
          Upload a JSON file with your custom world structure
        </p>
      </div>
      
      <!-- Reset World -->
      <div style="margin-bottom: 30px;">
        <button id="resetWorldBtn" style="
          background: #e74c3c;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          width: 100%;
          font-weight: bold;
        ">🔄 Reset to Default World</button>
        <p style="color: #bdc3c7; font-size: 12px; margin-top: 5px;">
          This will restore the original world and reset your position
        </p>
      </div>
      
      <!-- Back Button -->
      <div style="text-align: center;">
        <button id="backToMainFromWorld" style="
          background: #7f8c8d;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        ">← Back to Main Menu</button>
      </div>
    </div>

    <!-- Controls Sub-Menu -->
    <div id="controlsMenu" style="background: #2c3e50; padding: 30px; border-radius: 10px; min-width: 500px; max-width: 600px; display: none;">
      <h2 style="color: #f39c12; text-align: center; margin-bottom: 30px;">🎮 Controls</h2>
      
      <div style="color: #bdc3c7; font-size: 14px; line-height: 1.6;">
        <div style="margin-bottom: 20px;">
          <h3 style="color: #ecf0f1; margin-bottom: 10px;">Movement:</h3>
          <p><strong>W, A, S, D:</strong> Move forward, left, backward, right</p>
          <p><strong>SPACE:</strong> Jump</p>
          <p><strong>MOUSE:</strong> Look around</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #ecf0f1; margin-bottom: 10px;">Environment:</h3>
          <p><strong>N:</strong> Toggle Day/Night cycle</p>
          <p><strong>F:</strong> Toggle Advanced Volumetric Fog</p>
          <p><strong>G:</strong> Switch between fog types</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #ecf0f1; margin-bottom: 10px;">Interface:</h3>
          <p><strong>H:</strong> Toggle hitbox visibility</p>
          <p><strong>ESC:</strong> Open/Close this menu</p>
          <p><strong>ENTER:</strong> Start game (from main screen)</p>
        </div>
        
        <div style="background: #34495e; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="color: #f39c12; font-weight: bold; margin-bottom: 5px;">Tips:</p>
          <p style="font-size: 12px;">• Use the Environment Settings to customize fog and lighting</p>
          <p style="font-size: 12px;">• Upload custom worlds through World Settings</p>
          <p style="font-size: 12px;">• Advanced fog provides realistic volumetric lighting effects</p>
          <p style="font-size: 12px;">• Create custom worlds using the online tree generator</p>
        </div>
      </div>
      
      <!-- Back Button -->
      <div style="text-align: center; margin-top: 30px;">
        <button id="backToMainFromControls" style="
          background: #7f8c8d;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        ">← Back to Main Menu</button>
      </div>
    </div>

    <!-- Create World Sub-Menu -->
    <div id="createWorldMenu" style="background: #2c3e50; padding: 30px; border-radius: 10px; min-width: 500px; max-width: 600px; display: none;">
      <h2 style="color: #9b59b6; text-align: center; margin-bottom: 30px;">🎨 Create Custom World</h2>
      
      <div style="color: #bdc3c7; font-size: 14px; line-height: 1.6; text-align: center;">
        <div style="background: #34495e; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #9b59b6; margin-bottom: 15px;">🌐 Online World Creator</h3>
          <p style="margin-bottom: 15px;">
            Use our online tool to create custom worlds with an intuitive visual interface.
            Design complex tree structures, set node properties, and export directly to JSON.
          </p>
          
          <button id="openCreatorWebsite" style="
            background: #9b59b6;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0;
            transition: background 0.3s;
          ">🚀 Open World Creator</button>
          
          <p style="font-size: 12px; color: #95a5a6; margin-top: 10px;">
            Opens in a new tab - Create, preview, and download your custom world JSON
          </p>
        </div>
        
        <div style="background: #2c3e50; border: 2px solid #34495e; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <h4 style="color: #ecf0f1; margin-bottom: 10px;">📋 Quick Guide:</h4>
          <div style="text-align: left; font-size: 13px;">
            <p><strong>1.</strong> Click "Open World Creator" above</p>
            <p><strong>2.</strong> Design your world structure using the visual editor</p>
            <p><strong>3.</strong> Set node names, positions, and connections</p>
            <p><strong>4.</strong> Export your design as JSON</p>
            <p><strong>5.</strong> Return here and upload via World Settings</p>
          </div>
        </div>
        
        <div style="background: #1abc9c; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
          <p style="color: white; font-weight: bold; margin: 0;">
            💡 Pro Tip: Save your JSON files locally for easy re-importing!
          </p>
        </div>
      </div>
      
      <!-- Back Button -->
      <div style="text-align: center;">
        <button id="backToMainFromCreate" style="
          background: #7f8c8d;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        ">← Back to Main Menu</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(pauseMenuElement);
}

/**
 * Setup pause menu event listeners
 */
function setupPauseMenuEvents() {
  // Main menu navigation
  document.getElementById('environmentMenuBtn').addEventListener('click', () => showMenu('environment'));
  document.getElementById('worldMenuBtn').addEventListener('click', () => showMenu('world'));
  document.getElementById('controlsMenuBtn').addEventListener('click', () => showMenu('controls'));
  document.getElementById('createWorldBtn').addEventListener('click', () => showMenu('createWorld'));
  document.getElementById('resumeGameBtn').addEventListener('click', closePauseMenu);
  
  // Back buttons
  document.getElementById('backToMainFromEnvironment').addEventListener('click', () => showMenu('main'));
  document.getElementById('backToMainFromWorld').addEventListener('click', () => showMenu('main'));
  document.getElementById('backToMainFromControls').addEventListener('click', () => showMenu('main'));
  document.getElementById('backToMainFromCreate').addEventListener('click', () => showMenu('main'));
  
  // Create World menu
  document.getElementById('openCreatorWebsite').addEventListener('click', openWorldCreatorWebsite);
  
  // Environment settings
  document.getElementById('dayNightToggle').addEventListener('click', () => {
    const targetNight = toggleDayNight();
    updateDayNightButton();
    if (window.showMessage) {
      window.showMessage(`Switching to ${targetNight ? 'Night' : 'Day'} mode...`, 'info');
    }
  });
  
  document.getElementById('fogTypeSelect').addEventListener('change', (e) => {
    handleFogTypeChange(e.target.value);
  });
  
  document.getElementById('fogDensitySlider').addEventListener('input', (e) => {
    updateFogDensity(parseFloat(e.target.value));
  });
  
  document.getElementById('lightScatteringSlider').addEventListener('input', (e) => {
    updateLightScattering(parseFloat(e.target.value));
  });
  
  // World settings
  document.getElementById('pauseFileInput').addEventListener('change', handleFileUpload);
  document.getElementById('resetWorldBtn').addEventListener('click', () => {
    if (window.resetToDefaultWorld) {
      window.resetToDefaultWorld();
    }
    closePauseMenu();
  });
  
  // ESC key to toggle pause menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (pauseMenuOpen) {
        closePauseMenu();
      } else {
        openPauseMenu();
      }
    }
  });
  
  // Add hover effects
  addHoverEffects();
  
  // Initialize UI state
  updateUI();
}

/**
 * Open the world creator website
 */
function openWorldCreatorWebsite() {
  // Updated to use the correct world creator website
  const creatorURL = 'https://liber-metrika.vercel.app/tree_interactor';
  
  try {
    window.open(creatorURL, '_blank', 'noopener,noreferrer');
    
    if (window.showMessage) {
      window.showMessage('Opening World Creator in new tab...', 'info');
    }
    
    // Optionally close the pause menu
    closePauseMenu();
  } catch (error) {
    console.error('Error opening world creator website:', error);
    
    if (window.showMessage) {
      window.showMessage('Could not open World Creator. Please check your browser settings.', 'error');
    }
    
    // Fallback: copy URL to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(creatorURL).then(() => {
        if (window.showMessage) {
          window.showMessage('World Creator URL copied to clipboard!', 'success');
        }
      }).catch(() => {
        if (window.showMessage) {
          window.showMessage(`Manual URL: ${creatorURL}`, 'info');
        }
      });
    }
  }
}

/**
 * Open the pause menu
 */
function openPauseMenu() {
  pauseMenuOpen = true;
  pauseMenuElement.style.display = 'flex';
  showMenu('main'); // Always start with main menu
  
  // Unlock pointer if it's locked
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

/**
 * Close the pause menu
 */
function closePauseMenu() {
  pauseMenuOpen = false;
  pauseMenuElement.style.display = 'none';
  currentMenu = 'main';
}

/**
 * Show specific menu
 */
function showMenu(menuName) {
  // Hide all menus
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('environmentMenu').style.display = 'none';
  document.getElementById('worldMenu').style.display = 'none';
  document.getElementById('controlsMenu').style.display = 'none';
  document.getElementById('createWorldMenu').style.display = 'none';
  
  // Show selected menu
  document.getElementById(menuName + 'Menu').style.display = 'block';
  currentMenu = menuName;
  
  // Update UI for environment menu
  if (menuName === 'environment') {
    updateUI();
  }
}

/**
 * Add hover effects to buttons
 */
function addHoverEffects() {
  const buttons = pauseMenuElement.querySelectorAll('button');
  buttons.forEach(button => {
    const originalBg = button.style.background;
    
    button.addEventListener('mouseenter', () => {
      const color = originalBg.includes('#3498db') ? '#2980b9' :
                   originalBg.includes('#e74c3c') ? '#c0392b' :
                   originalBg.includes('#f39c12') ? '#e67e22' :
                   originalBg.includes('#27ae60') ? '#229954' :
                   originalBg.includes('#9b59b6') ? '#8e44ad' :
                   originalBg.includes('#7f8c8d') ? '#6c7b7d' : originalBg;
      button.style.background = color;
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = originalBg;
    });
  });
}

/**
 * Update UI elements to reflect current state
 */
function updateUI() {
  updateDayNightButton();
  updateFogTypeSelect();
  updateFogControls();
}

/**
 * Update day/night button text
 */
function updateDayNightButton() {
  const button = document.getElementById('dayNightToggle');
  if (button) {
    const isNight = getIsNightMode();
    button.textContent = isNight ? '☀️ Switch to Day' : '🌙 Switch to Night';
  }
}

/**
 * Update fog type selection
 */
function updateFogTypeSelect() {
  const select = document.getElementById('fogTypeSelect');
  if (select) {
    const basicFogEnabled = isFogEnabled();
    const advancedFogEnabled = isAdvancedFogEnabled();
    
    if (advancedFogEnabled) {
      select.value = 'advanced';
    } else if (basicFogEnabled) {
      select.value = 'basic';
    } else {
      select.value = 'none';
    }
  }
}

/**
 * Update fog control visibility
 */
function updateFogControls() {
  const fogType = document.getElementById('fogTypeSelect')?.value;
  const densityContainer = document.getElementById('fogDensityContainer');
  const scatteringContainer = document.getElementById('lightScatteringContainer');
  
  if (densityContainer && scatteringContainer) {
    if (fogType === 'advanced') {
      densityContainer.style.display = 'block';
      scatteringContainer.style.display = 'block';
    } else {
      densityContainer.style.display = 'none';
      scatteringContainer.style.display = 'none';
    }
  }
}

/**
 * Handle fog type change
 */
function handleFogTypeChange(fogType) {
  const basicEnabled = isFogEnabled();
  const advancedEnabled = isAdvancedFogEnabled();
  
  // Disable current fog
  if (basicEnabled) toggleFog();
  if (advancedEnabled) toggleAdvancedFog();
  
  // Enable selected fog type
  switch (fogType) {
    case 'basic':
      if (!isFogEnabled()) toggleFog();
      if (window.showMessage) {
        window.showMessage('Switched to Basic Particle Fog', 'info');
      }
      break;
    case 'advanced':
      if (!isAdvancedFogEnabled()) toggleAdvancedFog();
      if (window.showMessage) {
        window.showMessage('Switched to Advanced Volumetric Fog', 'info');
      }
      break;
    case 'none':
    default:
      if (window.showMessage) {
        window.showMessage('Fog disabled', 'info');
      }
      break;
  }
  
  updateFogControls();
}

/**
 * Update fog density
 */
function updateFogDensity(value) {
  document.getElementById('fogDensityValue').textContent = value.toFixed(2);
  
  // Update advanced fog uniforms if available
  import('./advancedFogEffects.js').then(module => {
    if (module.updateFogDensity) {
      module.updateFogDensity(value);
    }
  });
}

/**
 * Update light scattering
 */
function updateLightScattering(value) {
  document.getElementById('lightScatteringValue').textContent = value.toFixed(1);
  
  // Update advanced fog uniforms if available
  import('./advancedFogEffects.js').then(module => {
    if (module.updateLightScattering) {
      module.updateLightScattering(value);
    }
  });
}

/**
 * Handle file upload
 */
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file && file.type === 'application/json') {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        
        // Use the existing file upload logic from main.js
        if (window.handleCustomWorldUpload) {
          window.handleCustomWorldUpload(jsonData);
        }
        
        closePauseMenu();
      } catch (error) {
        console.error('Error parsing JSON:', error);
        if (window.showMessage) {
          window.showMessage('Error parsing JSON file. Please check the file format.', 'error');
        }
      }
    };
    reader.readAsText(file);
  }
  
  // Clear the input
  event.target.value = '';
}

/**
 * Check if pause menu is open
 */
export function isPauseMenuOpen() {
  return pauseMenuOpen;
}

/**
 * Get current menu state
 */
export function getCurrentMenu() {
  return currentMenu;
}
