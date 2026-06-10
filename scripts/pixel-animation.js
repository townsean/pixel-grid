// Floating pixel animation helpers (ES module)
const floatingPixelPalette = ['#f6eddb', '#f4d89e', '#c18753', '#f9f2e4', '#deb67f', '#d1ad7a', '#f4efe2', '#efe0b8', '#b3824c', '#f5f0df', '#e0c591', '#c79b67'];

export function initFloatingPixels() {
    const leftColumn = document.querySelector('.pixel-column--left');
    const rightColumn = document.querySelector('.pixel-column--right');
    if (!leftColumn || !rightColumn) return;

    const sizes = ['small','medium','large','small','medium','large','small','medium','large','small','medium','large','small','medium','large','small','medium','large','small','medium','large','small','medium','large','small','medium'];
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

export function applyFloatingPixelColors(colorCounts) {
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
