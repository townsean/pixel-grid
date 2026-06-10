import { formatColor, buildRGBALookup } from './colors.js';

export function exportGridPNG(gridCanvas, filename = 'pixels-grid.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = gridCanvas.toDataURL('image/png');
  link.click();
}

export function exportCSV(appState) {
  if (!appState || !appState.colorCounts) return;
  const useHex = document.getElementById('show-hex').checked;
  let csv = 'Hex,RGB,Count,Percentage\n';
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
  a.download = `${(appState.originalFileName || 'pixels')}-color-counts.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function generatePrintable(appState) {
  if (!appState || !appState.imageData) return;

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

      for (let x = coordInterval - 1; x < appState.width; x += coordInterval) {
        const px = paddingLeft + x * printScale + printScale / 2;
        pCtx.fillText((x + 1).toString(), px, paddingTop / 2);
      }

      pCtx.textAlign = 'right';
      for (let y = coordInterval - 1; y < appState.height; y += coordInterval) {
        const py = paddingTop + y * printScale + printScale / 2;
        pCtx.fillText((y + 1).toString(), paddingLeft / 2, py);
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
}
