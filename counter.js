self.onmessage = function (e) {
    const data = e.data.imageData;
    const tolerance = e.data.tolerance || 0;

    const colorMap = new Map();

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        let a = data[i + 3];

        if (tolerance > 0) {
            const step = Math.max(1, Math.floor(tolerance / 6));
            r = Math.round(r / step) * step;
            g = Math.round(g / step) * step;
            b = Math.round(b / step) * step;
            a = a > 200 ? 255 : Math.round(a / 50) * 50;
        }

        const key = `${r},${g},${b},${a}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    const colorCounts = {};
    colorMap.forEach((count, key) => {
        const [r, g, b, a] = key.split(',').map(Number);
        const colorStr = (a === 255)
            ? `rgb(${r},${g},${b})`
            : `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
        colorCounts[colorStr] = count;
    });

    self.postMessage({
        command: "done",
        colorCounts: colorCounts
    });
};