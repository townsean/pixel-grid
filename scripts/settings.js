const SETTINGS_KEY = 'pixelGridV2_settings';

export function saveSettings() {
  const btn = document.getElementById('save-settings');
  if (!btn) return;

  const settings = {
    pixelScale: document.getElementById('pixel-scale').value,
    showGrid: document.getElementById('show-grid').checked,
    circleMode: document.getElementById('circle-mode').checked,
    enableTolerance: document.getElementById('enable-tolerance').checked,
    tolerance: document.getElementById('tolerance').value,
    printScale: document.getElementById('print-scale').value,
    showHex: document.getElementById('show-hex').checked,
    showCoords: document.getElementById('show-coords').checked,
    showCoordsExtra: document.getElementById('show-coords-extra').checked,
    coordInterval: document.getElementById('coord-interval').value,
    darkMode: document.getElementById('dark-mode').checked
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

  const orig = btn.textContent;
  btn.textContent = '✅ Saved!';
  setTimeout(() => btn.textContent = orig, 1200);
}

export function loadSettings() {
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
  document.getElementById('show-coords-extra').checked = s.showCoordsExtra || false;
  document.getElementById('coord-interval').value = s.coordInterval || 5;
  document.getElementById('dark-mode').checked = s.darkMode || false;
  document.body.classList.toggle('dark-mode', s.darkMode || false);
}
