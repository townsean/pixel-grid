// Color helper utilities (ES module)
export function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function formatColor(colorStr, useHex) {
    if (!useHex) return colorStr;
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return colorStr;
    const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
    return rgbToHex(r, g, b);
}

export function generateColorLabels(colorCounts) {
    const labels = {};
    const sortedColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);
    
    sortedColors.forEach((color, index) => {
        labels[color] = String.fromCharCode(65 + (index % 26));
    });
    
    return labels;
}

export function buildRGBALookup(colorCounts) {
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
