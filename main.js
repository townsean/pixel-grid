// ====================== main.js - PixelGrid ======================
const worker = new Worker('./counter.js');

let appState = {
    imageData: null,
    width: 0,
    height: 0,
    colorCounts: null,
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

// ====================== COLOR FORMAT HELPERS ======================
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function formatColor(colorStr, useHex) {
    if (!useHex) return colorStr;
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return colorStr;
    const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
    return rgbToHex(r, g, b);
}

// ====================== WORKER ======================
worker.addEventListener("message", (e) => {
    if (e.data.command === "done") {
        appState.colorCounts = e.data.colorCounts;
        drawColorSwatches(e.data.colorCounts);
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
    const scale = parseInt(document.getElementById('pixel-scale').value);
    const useCircles = document.getElementById('circle-mode').checked;
    const showGridLines = document.getElementById('show-grid').checked;
    const showCoords = document.getElementById('show-coords').checked;
    const coordInterval = parseInt(document.getElementById('coord-interval').value) || 5;

    const paddingTop = showCoords ? 40 : 5;
    const paddingLeft = showCoords ? 45 : 5;

    const baseWidth = appState.width * scale;
    const baseHeight = appState.height * scale;

    gridCanvas.width = baseWidth * gridZoom + paddingLeft;
    gridCanvas.height = baseHeight * gridZoom + paddingTop;

    gridCtx.imageSmoothingEnabled = false;
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

    // Background match page
    gridCtx.fillStyle = document.body.classList.contains('dark-mode') ? '#1e1e1e' : '#f8f8f8';
    gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);

    const data = appState.imageData.data;

    // Draw Pixels
    for (let y = 0; y < appState.height; y++) {
        for (let x = 0; x < appState.width; x++) {
            const i = (y * appState.width + x) * 4;
            gridCtx.fillStyle = `rgba(${data[i]},${data[i+1]},${data[i+2]},${data[i+3]/255})`;

            const px = paddingLeft + (x * scale + gridOffsetX) * gridZoom;
            const py = paddingTop + (y * scale + gridOffsetY) * gridZoom;
            const size = scale * gridZoom;

            if (useCircles) {
                const cx = px + size / 2;
                const cy = py + size / 2;
                const r = size * 0.42;
                gridCtx.beginPath();
                gridCtx.arc(cx, cy, r, 0, Math.PI * 2);
                gridCtx.fill();
                gridCtx.strokeStyle = 'rgba(0,0,0,0.5)';
                gridCtx.lineWidth = Math.max(1.5, size * 0.08);
                gridCtx.stroke();
            } else {
                gridCtx.fillRect(px, py, size, size);
            }

            if (showGridLines && !useCircles && gridZoom > 0.4) {
                gridCtx.strokeStyle = 'rgba(0,0,0,0.25)';
                gridCtx.lineWidth = 1 / gridZoom;
                gridCtx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
            }
        }
    }

    // Coordinate Labels - OUTSIDE
    if (showCoords && gridZoom > 0.5) {
        const textColor = document.body.classList.contains('dark-mode') ? '#ffffff' : '#000000';
        gridCtx.fillStyle = textColor;
        gridCtx.font = `bold ${Math.max(12, Math.floor(14 * gridZoom))}px Arial`;
        gridCtx.textAlign = 'center';
        gridCtx.textBaseline = 'middle';

        const interval = coordInterval;

        // X labels (Top)
        for (let x = interval - 1; x < appState.width; x += interval) {
            const px = paddingLeft + (x * scale + gridOffsetX) * gridZoom + (scale * gridZoom) / 2;
            gridCtx.fillText((x + 1).toString(), px, 25);
        }

        // Y labels (Left)
        gridCtx.textAlign = 'right';
        for (let y = interval - 1; y < appState.height; y += interval) {
            const py = paddingTop + (y * scale + gridOffsetY) * gridZoom + (scale * gridZoom) / 2;
            gridCtx.fillText((y + 1).toString(), 35, py);
        }
    }

    document.getElementById('zoom-level').textContent = Math.round(gridZoom * 100) + '%';
}

function resetZoom() {
    gridZoom = 1;
    gridOffsetX = 0;
    gridOffsetY = 0;
    renderPixelGrid();
}

// ====================== ZOOM & PAN ======================
gridCanvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = gridCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.2, Math.min(8, gridZoom * factor));

    gridOffsetX = mouseX - (mouseX - gridOffsetX) * (newZoom / gridZoom);
    gridOffsetY = mouseY - (mouseY - gridOffsetY) * (newZoom / gridZoom);

    gridZoom = newZoom;
    renderPixelGrid();
});

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
    gridOffsetX += dx;
    gridOffsetY += dy;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    renderPixelGrid();
});

gridCanvas.addEventListener('dblclick', resetZoom);

// ====================== CONTROLS ======================
['pixel-scale', 'show-grid', 'circle-mode', 'show-coords', 'coord-interval'].forEach(id => {
    const el = document.getElementById(id);
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

    Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([color, count]) => {
            const displayColor = formatColor(color, useHex);
            const div = document.createElement('div');
            div.className = 'color-swatch-container';
            div.innerHTML = `
                <div class="color-swatch" style="background:${color}" title="${color}"></div>
                <span>${displayColor} — ${count}</span>
            `;
            container.appendChild(div);
        });

    document.getElementById('color-count').textContent = Object.keys(colorCounts).length;
}

// ====================== EXPORTS ======================
document.getElementById('export-grid-png').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `${appState.originalFileName || 'pixels'}-grid.png`;
    link.href = gridCanvas.toDataURL('image/png');
    link.click();
});

document.getElementById('export-csv').addEventListener('click', () => {
    if (!appState.colorCounts) return;
    const useHex = document.getElementById('show-hex').checked;
    let csv = "Hex,RGB,Count,Percentage\n";
    const total = appState.width * appState.height;

    Object.entries(appState.colorCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([rgbColor, count]) => {
            const hexColor = formatColor(rgbColor, true);
            const percentage = (count / total * 100).toFixed(2);
            csv += `"${hexColor}","${rgbColor}",${count},${percentage}\n`;
        });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appState.originalFileName || 'pixels'}-color-counts.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

// ====================== PRINTABLE ======================
document.getElementById('generate-printable').addEventListener('click', () => {
    if (!appState.imageData) return;

    const scale = parseInt(document.getElementById('pixel-scale').value);
    const useCircles = document.getElementById('circle-mode').checked;
    const showGrid = document.getElementById('show-grid').checked;
    const printScale = parseInt(document.getElementById('print-scale').value) || 20;
    const useHex = document.getElementById('show-hex').checked;
    const showCoords = document.getElementById('show-coords').checked;
    const coordInterval = parseInt(document.getElementById('coord-interval').value) || 5;

    const printWin = window.open('', '_blank');
    const doc = printWin.document;

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>PixelGrid — ${appState.originalFileName}</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; margin: 20px; background:#f8f8f8; }
                h1 { text-align:center; margin:20px 0 10px; }
                .info { text-align:center; margin-bottom:25px; color:#444; }
                canvas { display:block; margin:20px auto 30px; border:3px solid #222; box-shadow:0 4px 15px rgba(0,0,0,0.15); }
                .legend { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; max-width:1100px; margin:30px auto; padding:0 10px; }
                .legend-item { display:flex; align-items:center; gap:12px; background:white; padding:10px 14px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
                .legend-swatch { 
                    width:38px; height:38px; border:2px solid #ccc; flex-shrink:0; border-radius:4px; 
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                @media print {
                    body { margin:15px; background:white; }
                    canvas { box-shadow:none; border:2px solid #222; }
                    .legend-item { box-shadow:none; border:1px solid #ddd; }
                    .legend-swatch { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            </style>
        </head>
        <body>
            <h1>PixelGrid — ${appState.originalFileName}</h1>
            <div class="info">
                Print Scale: ${printScale}px • 
                ${useCircles ? 'Circular' : 'Square'} pixels • 
                ${showGrid ? 'With Grid' : 'No Grid'} • 
                Top-left = (1,1)
            </div>
            <canvas id="print-canvas"></canvas>
            <div class="legend" id="legend"></div>
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        const pCanvas = doc.getElementById('print-canvas');
        const pCtx = pCanvas.getContext('2d');
        pCanvas.width = appState.width * printScale;
        pCanvas.height = appState.height * printScale;
        pCtx.imageSmoothingEnabled = false;

        const data = appState.imageData.data;

        for (let y = 0; y < appState.height; y++) {
            for (let x = 0; x < appState.width; x++) {
                const i = (y * appState.width + x) * 4;
                pCtx.fillStyle = `rgba(${data[i]},${data[i+1]},${data[i+2]},${data[i+3]/255})`;

                const px = x * printScale;
                const py = y * printScale;
                const size = printScale;

                if (useCircles) {
                    const cx = px + size/2;
                    const cy = py + size/2;
                    const r = size * 0.42;
                    pCtx.beginPath();
                    pCtx.arc(cx, cy, r, 0, Math.PI * 2);
                    pCtx.fill();
                    pCtx.strokeStyle = 'rgba(0,0,0,0.55)';
                    pCtx.lineWidth = Math.max(2, size * 0.07);
                    pCtx.stroke();
                } else {
                    pCtx.fillRect(px, py, size, size);
                }

                if (showGrid && !useCircles) {
                    pCtx.strokeStyle = 'rgba(0,0,0,0.35)';
                    pCtx.lineWidth = 1;
                    pCtx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
                }
            }
        }

        // Print Coordinates - Outside
        if (showCoords) {
            pCtx.fillStyle = '#000000';
            pCtx.font = `bold ${Math.max(12, printScale * 0.6)}px Arial`;
            pCtx.textAlign = 'center';
            pCtx.textBaseline = 'middle';

            const interval = coordInterval;

            for (let x = interval - 1; x < appState.width; x += interval) {
                const px = x * printScale + printScale / 2;
                pCtx.fillText((x + 1).toString(), px, printScale * 0.35);
            }

            pCtx.textAlign = 'right';
            for (let y = interval - 1; y < appState.height; y += interval) {
                const py = y * printScale + printScale / 2;
                pCtx.fillText((y + 1).toString(), printScale * 0.75, py);
            }
        }

        // Legend
        const legendDiv = doc.getElementById('legend');
        const sorted = Object.entries(appState.colorCounts).sort((a, b) => b[1] - a[1]);
        const total = appState.width * appState.height;

        sorted.forEach(([color, count]) => {
            const displayColor = formatColor(color, useHex);
            const pct = ((count / total) * 100).toFixed(2);
            const item = doc.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-swatch" style="background-color: ${color} !important;"></div>
                <div><strong>${displayColor}</strong><br><small>${count.toLocaleString()} ${count > 1 ? 'pixels' : 'pixel'} (${pct}%)</small></div>
            `;
            legendDiv.appendChild(item);
        });
    }, 150);
});

// ====================== UTILITIES ======================
function resetUI() {
    document.getElementById('visualization-section').classList.add('invisible');
    document.getElementById('pixel-count-container').classList.add('invisible');
}

function showWait() {
    document.getElementById('wait-indicator').style.display = 'block';
}

function hideWait() {
    document.getElementById('wait-indicator').style.display = 'none';
}

// ====================== KEYBOARD SHORTCUTS ======================
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

// ====================== SAVE / LOAD SETTINGS ======================
const SETTINGS_KEY = 'pixelGridV2_settings';

function saveSettings() {
    const settings = {
        pixelScale: document.getElementById('pixel-scale').value,
        showGrid: document.getElementById('show-grid').checked,
        circleMode: document.getElementById('circle-mode').checked,
        enableTolerance: document.getElementById('enable-tolerance').checked,
        tolerance: document.getElementById('tolerance').value,
        printScale: document.getElementById('print-scale').value,
        showHex: document.getElementById('show-hex').checked,
        showCoords: document.getElementById('show-coords').checked,
        coordInterval: document.getElementById('coord-interval').value,
        darkMode: document.getElementById('dark-mode').checked
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    const btn = document.getElementById('save-settings');
    const orig = btn.textContent;
    btn.textContent = '✅ Saved!';
    setTimeout(() => btn.textContent = orig, 1200);
}

function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return;
    const s = JSON.parse(saved);

    document.getElementById('pixel-scale').value = s.pixelScale || 16;
    document.getElementById('scale-value').textContent = (s.pixelScale || 16) + 'px';
    document.getElementById('show-grid').checked = s.showGrid !== false;
    document.getElementById('circle-mode').checked = s.circleMode || false;
    document.getElementById('enable-tolerance').checked = s.enableTolerance || false;
    document.getElementById('tolerance').value = s.tolerance || 10;
    document.getElementById('print-scale').value = s.printScale || 20;
    document.getElementById('show-hex').checked = s.showHex !== false;
    document.getElementById('show-coords').checked = s.showCoords !== false;
    document.getElementById('coord-interval').value = s.coordInterval || 5;
    document.getElementById('dark-mode').checked = s.darkMode || false;
    document.body.classList.toggle('dark-mode', s.darkMode || false);
}

document.getElementById('save-settings').addEventListener('click', saveSettings);
document.getElementById('load-settings').addEventListener('click', loadSettings);

window.addEventListener('load', loadSettings);