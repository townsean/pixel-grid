import { generateColorLabels, formatColor } from './colors.js';
import { initFloatingPixels, applyFloatingPixelColors } from './pixel-animation.js';
import { renderPixelGrid as renderGrid } from './render.js';
import { exportGridPNG, exportCSV, generatePrintable } from './exports.js';
import { saveSettings, loadSettings } from './settings.js';

const worker = new Worker(new URL('./counter.js', import.meta.url));

let appState = {
    imageData: null,
    width: 0,
    height: 0,
    colorCounts: null,
    colorLabels: null,
    originalFileName: ''
};

// Zoom & Pan state
let gridZoom = 1;
let gridOffsetX = 0;
let gridOffsetY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

const gridCanvas = document.getElementById('pixel-grid-canvas');
const gridCtx = gridCanvas.getContext('2d');

// Update canvas when the window resizes
window.addEventListener('resize', () => {
    if (appState.imageData) renderPixelGrid();
});

// Worker
worker.addEventListener("message", (e) => {
    if (e.data.command === "done") {
        appState.colorCounts = e.data.colorCounts;
        appState.colorLabels = generateColorLabels(e.data.colorCounts);
        drawColorSwatches(e.data.colorCounts);
        applyFloatingPixelColors(e.data.colorCounts);
        document.getElementById('pixel-grid-canvas').classList.add('expanded');
        resetZoom();
        renderPixelGrid();

        document.getElementById('visualization-section').classList.remove('invisible');
        document.getElementById('pixel-count-container').classList.remove('invisible');
        hideWait();
    }
});

// ====================== IMAGE UPLOAD ======================
document.getElementById("image").addEventListener('change', e => {
    if (e.target.files[0]) loadImage(e.target.files[0]);
});

function loadImage(file) {
    appState.originalFileName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
        resetUI();
        const origCanvas = document.getElementById('original-canvas');
        origCanvas.width = img.width;
        origCanvas.height = img.height;
        const ctx = origCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        appState.imageData = ctx.getImageData(0, 0, img.width, img.height);
        appState.width = img.width;
        appState.height = img.height;

        showWait();
        worker.postMessage({
            imageData: appState.imageData.data,
            tolerance: getTolerance()
        });
        URL.revokeObjectURL(url);
    };
    img.src = url;
}

function getTolerance() {
    return document.getElementById('enable-tolerance').checked ?
        parseInt(document.getElementById('tolerance').value) || 0 : 0;
}

// ====================== RENDERING ======================
function renderPixelGrid() {
    renderGrid(appState, gridCanvas, gridCtx, { gridZoom, gridOffsetX, gridOffsetY });
}

function resetZoom() {
    gridOffsetX = 0;
    gridOffsetY = 0;
    setZoomFromPercent(100);
}

// ====================== ZOOM & PAN ======================
const zoomSlider = document.getElementById('zoom-slider');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');

function updateZoomUI() {
    document.getElementById('zoom-level').textContent = Math.round(gridZoom * 100) + '%';
    if (zoomSlider) zoomSlider.value = Math.round(gridZoom * 100);
}

function setZoomFromPercent(percent) {
    gridZoom = Math.max(0.2, Math.min(8, percent / 100));
    updateZoomUI();
    if (appState.imageData) renderPixelGrid();
}

function adjustZoom(delta) {
    setZoomFromPercent(gridZoom * 100 + delta);
}

if (zoomSlider) {
    zoomSlider.addEventListener('input', () => {
        setZoomFromPercent(parseInt(zoomSlider.value, 10));
    });
}

if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => adjustZoom(10));
}

if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => adjustZoom(-10));
}

gridCanvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    gridCanvas.style.cursor = 'grabbing';
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    gridCanvas.style.cursor = 'grab';
});

window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = (e.clientX - lastMouseX) / gridZoom;
    const dy = (e.clientY - lastMouseY) / gridZoom;
    gridOffsetX -= dx;
    gridOffsetY -= dy;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    renderPixelGrid();
});

gridCanvas.addEventListener('dblclick', resetZoom);

// ====================== CONTROLS ======================
['pixel-scale', 'show-grid', 'show-major-lines', 'circle-mode', 'show-coords', 'show-coords-extra', 'coord-interval', 'show-color-labels'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
        if (id === 'pixel-scale') {
            document.getElementById('scale-value').textContent = el.value + 'px';
        }
        if (appState.imageData) renderPixelGrid();
    });
});

document.getElementById('show-hex').addEventListener('change', () => {
    if (appState.colorCounts) drawColorSwatches(appState.colorCounts);
});

document.getElementById('enable-tolerance').addEventListener('change', reprocessImage);
document.getElementById('tolerance').addEventListener('input', () => {
    if (document.getElementById('enable-tolerance').checked && appState.imageData) reprocessImage();
});

function reprocessImage() {
    if (!appState.imageData) return;
    showWait();
    worker.postMessage({ imageData: appState.imageData.data, tolerance: getTolerance() });
};

// Preset buttons
document.querySelectorAll('.presets button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.presets button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('pixel-scale').value = btn.dataset.size;
        document.getElementById('scale-value').textContent = btn.dataset.size + 'px';
        if (appState.imageData) renderPixelGrid();
    });
});

// Dark Mode
const darkModeToggle = document.getElementById('dark-mode');
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
}
darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkModeToggle.checked);
    if (appState.imageData) renderPixelGrid(); // refresh for text color
});

// ====================== COLOR SWATCHES ======================
function drawColorSwatches(colorCounts) {
    const container = document.getElementById('color-swatches');
    container.innerHTML = '';
    const useHex = document.getElementById('show-hex').checked;
    const showColorLabels = document.getElementById('show-color-labels').checked;

    const sorted = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1]);

    sorted.forEach(([color, count], index) => {
        const displayColor = formatColor(color, useHex);
        const label = showColorLabels && appState.colorLabels ? appState.colorLabels[color] : '';
        const div = document.createElement('div');
        div.className = 'color-swatch-container';
        div.innerHTML = `
            <div class="color-swatch" style="background:${color}" title="${color}"></div>
            <span>${label ? '[' + label + '] ' : ''}${displayColor} — ${count}</span>
        `;
        container.appendChild(div);
    });

    document.getElementById('color-count').textContent = Object.keys(colorCounts).length;
    // Show total pixel count (width * height)
    const totalPixelsEl = document.getElementById('total-pixels');
    if (totalPixelsEl) {
        totalPixelsEl.textContent = (appState.width * appState.height).toLocaleString();
    }
}

// ====================== EXPORTS ==================
document.getElementById('export-grid-png').addEventListener('click', () => {
    exportGridPNG(gridCanvas, `${appState.originalFileName || 'pixels'}-grid.png`);
});

document.getElementById('export-csv').addEventListener('click', () => {
    exportCSV(appState);
});

// ====================== PRINTABLE ==================
document.getElementById('generate-printable').addEventListener('click', () => {
    generatePrintable(appState);
});

// ====================== UTILITIES ==================
function resetUI() {
    document.getElementById('visualization-section').classList.add('invisible');
    document.getElementById('pixel-count-container').classList.add('invisible');
    document.getElementById('pixel-grid-canvas').classList.remove('expanded');
}

function showWait() {
    document.getElementById('wait-indicator').style.display = 'block';
}

function hideWait() {
    document.getElementById('wait-indicator').style.display = 'none';
}

// ====================== KEYBOARD SHORTCUTS ==================
document.addEventListener('keydown', e => {
    if (!appState.imageData) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        document.getElementById('generate-printable').click();
    }
    if (e.key.toLowerCase() === 'r') resetZoom();
    if (e.key === '+' || e.key === '=') { gridZoom = Math.min(8, gridZoom * 1.2); renderPixelGrid(); }
    if (e.key === '-') { gridZoom = Math.max(0.2, gridZoom / 1.2); renderPixelGrid(); }
});

// ====================== SAVE / LOAD SETTINGS ==================
document.getElementById('save-settings').addEventListener('click', saveSettings);
document.getElementById('load-settings').addEventListener('click', loadSettings);

window.addEventListener('load', () => {
    loadSettings();
    initFloatingPixels();
    // Initialize canvas dimensions
    const initialWidth = 800;
    const initialHeight = 600;
    gridCanvas.width = initialWidth;
    gridCanvas.height = initialHeight;
    gridCanvas.style.width = `${initialWidth}px`;
    gridCanvas.style.height = `${initialHeight}px`;
});
