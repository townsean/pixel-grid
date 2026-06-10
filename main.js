// ====================== main.js - PixelGrid ======================
const worker = new Worker('./counter.js');

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

const floatingPixelPalette = ['#f6eddb', '#f4d89e', '#c18753', '#f9f2e4', '#deb67f', '#d1ad7a', '#f4efe2', '#efe0b8', '#b3824c', '#f5f0df', '#e0c591', '#c79b67'];

function initFloatingPixels() {
    const leftColumn = document.querySelector('.pixel-column--left');
    const rightColumn = document.querySelector('.pixel-column--right');
    if (!leftColumn || !rightColumn) return;

    const sizes = ['small', 'medium', 'large', 'small', 'medium', 'large', 'small', 'medium', 'large', 'small', 'medium', 'large', 'small', 'medium', 'large', 'small', 'medium', 'large', 'small', 'medium', 'large', 'small', 'medium', 'large', 'small', 'medium'];
    [leftColumn, rightColumn].forEach((column, columnIndex) => {
        column.innerHTML = '';
        sizes.forEach((size, index) => {
            const pixel = document.createElement('span');
            const color = floatingPixelPalette[(columnIndex * sizes.length + index) % floatingPixelPalette.length];
            const left = 6 + Math.random() * 88;
            const duration = 12 + Math.random() * 10;
            const delay = -(Math.random() * duration * 1.75);
            pixel.className = `pixel pixel--${size}`;
            pixel.style.left = `${left}%`;
            pixel.style.animationDuration = `${duration}s`;
            pixel.style.animationDelay = `${delay}s`;
            pixel.style.background = color;
            column.appendChild(pixel);
        });
    });
}

function applyFloatingPixelColors(colorCounts) {
    const pixels = Array.from(document.querySelectorAll('.floating-pixel-columns .pixel'));
    if (!pixels.length || !colorCounts) return;

    const topColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);

    if (!topColors.length) return;

    pixels.forEach((pixel, index) => {
        pixel.style.background = topColors[index % topColors.length];
    });
}

// Update canvas when the window resizes
window.addEventListener('resize', () => {
    if (appState.imageData) renderPixelGrid();
});

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

// ====================== COLOR LABEL MAPPING ======================
function generateColorLabels(colorCounts) {
    const labels = {};
    const sortedColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);
    
    sortedColors.forEach((color, index) => {
        labels[color] = String.fromCharCode(65 + (index % 26)); // A-Z then repeat
    });
    
    return labels;
}

function buildRGBALookup(colorCounts) {
    const lookup = {};
    Object.keys(colorCounts).forEach(color => {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            const a = match[4] ? Math.round(parseFloat(match[4]) * 255) : 255;
            const key = `${r},${g},${b},${a}`;
            lookup[key] = color;
        }
    });
    return lookup;
}

// ====================== WORKER ======================
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

function applyFloatingPixelColors(colorCounts) {
    const pixels = Array.from(document.querySelectorAll('.floating-pixel-columns .pixel'));
    if (!pixels.length || !colorCounts) return;

    const topColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);

    if (!topColors.length) return;

    pixels.forEach((pixel, index) => {
        pixel.style.background = topColors[index % topColors.length];
    });
}

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
    if (!appState.imageData) return;
    
    const scale = parseInt(document.getElementById('pixel-scale').value);
    const useCircles = document.getElementById('circle-mode').checked;
    const showGridLines = document.getElementById('show-grid').checked;
    const showCoords = document.getElementById('show-coords').checked;
    const coordInterval = parseInt(document.getElementById('coord-interval').value) || 5;
    const showColorLabels = document.getElementById('show-color-labels').checked;

    const size = scale * gridZoom;
    const paddingTop = showCoords ? Math.max(40, size * 1.5) : 5;
    const paddingLeft = showCoords ? Math.max(45, size * 2) : 5;
    const paddingRight = 5;
    const paddingBottom = 5;

    const gridWidth = appState.width * size;
    const gridHeight = appState.height * size;

    gridCanvas.width = Math.round(gridWidth + paddingLeft + paddingRight);
    gridCanvas.height = Math.round(gridHeight + paddingTop + paddingBottom);
    gridCanvas.style.width = `${gridCanvas.width}px`;
    gridCanvas.style.height = `${gridCanvas.height}px`;

    gridCtx.imageSmoothingEnabled = false;
    gridCtx.fillStyle = document.body.classList.contains('dark-mode') ? '#1e1e1e' : '#f8f8f8';
    gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);

    const baseX = paddingLeft + gridOffsetX;
    const baseY = paddingTop + gridOffsetY;

    const data = appState.imageData.data;

    // Draw Pixels
    for (let y = 0; y < appState.height; y++) {
        for (let x = 0; x < appState.width; x++) {
            const i = (y * appState.width + x) * 4;
            gridCtx.fillStyle = `rgba(${data[i]},${data[i+1]},${data[i+2]},${data[i+3]/255})`;

            const px = baseX + x * size;
            const py = baseY + y * size;
            const tileSize = size;

            if (useCircles) {
                const cx = px + tileSize / 2;
                const cy = py + tileSize / 2;
                const r = tileSize * 0.42;
                gridCtx.beginPath();
                gridCtx.arc(cx, cy, r, 0, Math.PI * 2);
                gridCtx.fill();
                gridCtx.strokeStyle = 'rgba(0,0,0,0.5)';
                gridCtx.lineWidth = Math.max(1.5, tileSize * 0.08);
                gridCtx.stroke();
            } else {
                gridCtx.fillRect(px, py, tileSize, tileSize);
            }

            if (showGridLines && !useCircles) {
                gridCtx.strokeStyle = 'rgba(0,0,0,0.25)';
                gridCtx.lineWidth = 0.5 / gridZoom;
                gridCtx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
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
            const px = baseX + x * size + size / 2;
            gridCtx.fillText((x + 1).toString(), px, baseY - 20);
        }

        // Y labels (Left)
        gridCtx.textAlign = 'right';
        for (let y = interval - 1; y < appState.height; y += interval) {
            const py = baseY + y * size + size / 2;
            gridCtx.fillText((y + 1).toString(), baseX - 10, py);
        }
    }

    // Color Labels - ON GRID
    if (showColorLabels && gridZoom > 0.3 && appState.colorLabels) {
        const fontSize = Math.max(10, Math.floor(11 * gridZoom));
        const isDark = document.body.classList.contains('dark-mode');
        const rgbaLookup = buildRGBALookup(appState.colorCounts);
        
        gridCtx.font = `bold ${fontSize}px Arial`;
        gridCtx.textAlign = 'center';
        gridCtx.textBaseline = 'middle';

        for (let y = 0; y < appState.height; y++) {
            for (let x = 0; x < appState.width; x++) {
                const i = (y * appState.width + x) * 4;
                const r = appState.imageData.data[i];
                const g = appState.imageData.data[i + 1];
                const b = appState.imageData.data[i + 2];
                const a = appState.imageData.data[i + 3];
                const rgbaKey = `${r},${g},${b},${a}`;
                const colorStr = rgbaLookup[rgbaKey];
                const label = colorStr ? appState.colorLabels[colorStr] : null;
                
                if (label) {
                    const px = baseX + x * size + size / 2;
                    const py = baseY + y * size + size / 2;
                    
                    // White text with dark outline for contrast
                    gridCtx.fillStyle = 'white';
                    gridCtx.strokeStyle = isDark ? 'white' : 'black';
                    gridCtx.lineWidth = Math.max(1, 1.5 / gridZoom);
                    gridCtx.strokeText(label, px, py);
                    gridCtx.fillStyle = isDark ? 'black' : 'white';
                    gridCtx.fillText(label, px, py);
                }
            }
        }
    }

    // Restore context state
    gridCtx.restore();

    document.getElementById('zoom-level').textContent = Math.round(gridZoom * 100) + '%';
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
['pixel-scale', 'show-grid', 'circle-mode', 'show-coords', 'coord-interval', 'show-color-labels'].forEach(id => {
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
    const showColorLabels = document.getElementById('show-color-labels').checked;

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
                canvas { display:block; margin:20px auto 30px; border:none; }
                .legend { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; max-width:1100px; margin:30px auto; padding:0 10px; }
                .legend-item { display:flex; align-items:center; gap:12px; background:white; padding:10px 14px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
                .legend-swatch { 
                    width:38px; height:38px; border:2px solid #ccc; flex-shrink:0; border-radius:4px; 
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                @media print {
                    body { margin:15px; background:white; }
                    canvas { box-shadow:none; border:none; }
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
        const paddingTop = showCoords ? Math.max(40, printScale * 1.5) : 5;
        const paddingLeft = showCoords ? Math.max(45, printScale * 2) : 5;
        pCanvas.width = appState.width * printScale + paddingLeft;
        pCanvas.height = appState.height * printScale + paddingTop;
        pCtx.imageSmoothingEnabled = false;

        if (showCoords) {
            const offsetX = paddingLeft / 2;
            const offsetY = paddingTop / 2;
            pCanvas.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
            pCanvas.style.transformOrigin = 'center center';
        } else {
            pCanvas.style.transform = 'none';
        }

        const data = appState.imageData.data;

        for (let y = 0; y < appState.height; y++) {
            for (let x = 0; x < appState.width; x++) {
                const i = (y * appState.width + x) * 4;
                pCtx.fillStyle = `rgba(${data[i]},${data[i+1]},${data[i+2]},${data[i+3]/255})`;

                const px = paddingLeft + x * printScale;
                const py = paddingTop + y * printScale;
                const size = printScale;

                if (useCircles) {
                    const cx = px + size / 2;
                    const cy = py + size / 2;
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
            const labelY = paddingTop / 2;
            const labelX = paddingLeft / 2;

            for (let x = interval - 1; x < appState.width; x += interval) {
                const px = paddingLeft + x * printScale + printScale / 2;
                pCtx.fillText((x + 1).toString(), px, labelY);
            }

            pCtx.textAlign = 'right';
            for (let y = interval - 1; y < appState.height; y += interval) {
                const py = paddingTop + y * printScale + printScale / 2;
                pCtx.fillText((y + 1).toString(), labelX, py);
            }
        }

        // Color Labels - ON GRID
        if (showColorLabels && appState.colorLabels) {
            const fontSize = Math.max(10, printScale * 0.5);
            const rgbaLookup = buildRGBALookup(appState.colorCounts);
            pCtx.fillStyle = 'white';
            pCtx.font = `bold ${fontSize}px Arial`;
            pCtx.textAlign = 'center';
            pCtx.textBaseline = 'middle';

            for (let y = 0; y < appState.height; y++) {
                for (let x = 0; x < appState.width; x++) {
                    const i = (y * appState.width + x) * 4;
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];
                    const rgbaKey = `${r},${g},${b},${a}`;
                    const colorStr = rgbaLookup[rgbaKey];
                    const label = colorStr ? appState.colorLabels[colorStr] : null;
                    
                    if (label) {
                        const px = paddingLeft + x * printScale + printScale / 2;
                        const py = paddingTop + y * printScale + printScale / 2;
                        
                        // White text with black outline for contrast
                        pCtx.strokeStyle = 'black';
                        pCtx.lineWidth = Math.max(1, fontSize * 0.15);
                        pCtx.strokeText(label, px, py);
                        pCtx.fillStyle = 'white';
                        pCtx.fillText(label, px, py);
                    }
                }
            }
        }

        // Legend
        const legendDiv = doc.getElementById('legend');
        const sorted = Object.entries(appState.colorCounts).sort((a, b) => b[1] - a[1]);
        const total = appState.width * appState.height;

        sorted.forEach(([color, count]) => {
            const displayColor = formatColor(color, useHex);
            const pct = ((count / total) * 100).toFixed(2);
            const label = showColorLabels && appState.colorLabels ? appState.colorLabels[color] : '';
            const item = doc.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-swatch" style="background-color: ${color} !important;"></div>
                <div><strong>${label ? '[' + label + '] ' : ''}${displayColor}</strong><br><small>${count.toLocaleString()} ${count > 1 ? 'pixels' : 'pixel'} (${pct}%)</small></div>
            `;
            legendDiv.appendChild(item);
        });
    }, 150);
});

// ====================== UTILITIES ======================
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