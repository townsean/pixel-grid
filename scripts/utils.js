import { buildRGBALookup } from './colors.js';

export function computePadding({ showCoords = false, showCoordsExtra = false, size = 16 } = {}) {
  const paddingTop = showCoords ? Math.max(40, Math.round(size * 1.5)) : 5;
  const paddingLeft = showCoords ? Math.max(45, Math.round(size * 2)) : 5;
  const paddingRight = showCoordsExtra ? Math.max(45, Math.round(size * 2)) : 5;
  const paddingBottom = showCoordsExtra ? Math.max(40, Math.round(size * 1.5)) : 5;
  return { paddingTop, paddingLeft, paddingRight, paddingBottom };
}

export function drawMajorGridLines(ctx, baseX, baseY, cols, rows, tileSize, coordInterval, opts = {}) {
  if (!ctx || coordInterval <= 1) return;
  const isDark = !!opts.isDark;
  const lineWidth = opts.lineWidth || Math.max(1, Math.round(tileSize * 0.08));
  ctx.save();
  // Darken major lines so they contrast with regular grid lines
  ctx.strokeStyle = isDark ? 'rgba(55,55,55,0.60)' : 'rgba(0,0,0,0.60)';
  ctx.lineWidth = Math.max(lineWidth, 1.2);

  // vertical lines
  for (let x = coordInterval - 1; x < cols; x += coordInterval) {
    const px = baseX + x * tileSize + 0.5;
    ctx.beginPath();
    ctx.moveTo(px, baseY + 0.5);
    ctx.lineTo(px, baseY + rows * tileSize + 0.5);
    ctx.stroke();
  }

  // horizontal lines
  for (let y = coordInterval - 1; y < rows; y += coordInterval) {
    const py = baseY + y * tileSize + 0.5;
    ctx.beginPath();
    ctx.moveTo(baseX + 0.5, py);
    ctx.lineTo(baseX + cols * tileSize + 0.5, py);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawCoordinateLabels(ctx, opts = {}) {
  const {
    showCoords,
    showCoordsExtra,
    coordInterval = 5,
    paddingLeft = 5,
    paddingTop = 5,
    baseX = 0,
    baseY = 0,
    cols = 0,
    rows = 0,
    tileSize = 16,
    fontSize = 12,
    textColor = '#000'
  } = opts;

  if (!ctx || !showCoords) return;
  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Top labels
  for (let x = coordInterval - 1; x < cols; x += coordInterval) {
    const px = baseX + x * tileSize + tileSize / 2;
    ctx.fillText((x + 1).toString(), px, paddingTop / 2);
  }

  // Left labels
  ctx.textAlign = 'right';
  for (let y = coordInterval - 1; y < rows; y += coordInterval) {
    const py = baseY + y * tileSize + tileSize / 2;
    ctx.fillText((y + 1).toString(), paddingLeft / 2, py);
  }

  // Bottom/Right if requested
  if (showCoordsExtra) {
    ctx.textAlign = 'center';
    const bottomY = baseY + rows * tileSize + (paddingTop / 2) + (paddingTop - 5);
    for (let x = coordInterval - 1; x < cols; x += coordInterval) {
      const px = baseX + x * tileSize + tileSize / 2;
      ctx.fillText((x + 1).toString(), px, baseY + rows * tileSize + paddingTop / 2 + (paddingTop * 0));
    }
    ctx.textAlign = 'left';
    const rightX = baseX + cols * tileSize + (paddingLeft / 2);
    for (let y = coordInterval - 1; y < rows; y += coordInterval) {
      const py = baseY + y * tileSize + tileSize / 2;
      ctx.fillText((y + 1).toString(), rightX, py);
    }
  }

  ctx.restore();
}

export function drawOnGridLabels(ctx, appState, opts = {}) {
  if (!ctx || !appState || !appState.colorLabels) return;
  const { baseX = 0, baseY = 0, cols = 0, rows = 0, tileSize = 16, fontSize = 12, isDark = false } = opts;
  const rgbaLookup = buildRGBALookup(appState.colorCounts || {});
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const data = appState.imageData.data;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const key = `${r},${g},${b},${a}`;
      const colorStr = rgbaLookup[key];
      const label = colorStr ? appState.colorLabels[colorStr] : null;
      if (!label) continue;
      const px = baseX + x * tileSize + tileSize / 2;
      const py = baseY + y * tileSize + tileSize / 2;
      ctx.strokeStyle = isDark ? 'black' : 'black';
      ctx.lineWidth = Math.max(1, fontSize * 0.15);
      ctx.strokeText(label, px, py);
      ctx.fillStyle = isDark ? '#fff' : '#fff';
      ctx.fillText(label, px, py);
    }
  }

  ctx.restore();
}
