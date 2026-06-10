import { buildRGBALookup } from './colors.js';

export function renderPixelGrid(appState, gridCanvas, gridCtx, opts = {}) {
    if (!appState || !appState.imageData) return;

    const gridZoom = opts.gridZoom || 1;
    const gridOffsetX = opts.gridOffsetX || 0;
    const gridOffsetY = opts.gridOffsetY || 0;

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

        for (let x = interval - 1; x < appState.width; x += interval) {
            const px = baseX + x * size + size / 2;
            gridCtx.fillText((x + 1).toString(), px, baseY - 20);
        }

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
