let isPaused = false;
let fotoModeEnabled = false;

function setupEventListeners() {
    document.getElementById('resetButton').addEventListener('click', resetCamera);
}

function toggleFotoMode() {
    fotoModeEnabled = !fotoModeEnabled;
    
    // If foto mode is disabled and currently paused, unpause
    if (!fotoModeEnabled && isPaused) {
        togglePause();
    }
}

function handleKeyPress(event) {
    if (event.code === 'KeyP') {
        toggleFotoMode();
    } else if (event.code === 'Escape') {
        if (fotoModeEnabled) {
            togglePause();
        }
    }
}
