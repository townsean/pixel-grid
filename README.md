# pixel-grid

A browser tool created to help pixel artists, cross-stitchers, bead artists, LEGO builders, and makers analyze images with **accurate color counts** and an **interactive scalable grid**.

## Synopsis

PixelGrid is a vanilla JS web application that accepts an image file (selected by the user) and displays the total number of pixels per a unique color. 

### ✨ Key Features

- Accurate color counting with **tolerance grouping**
- Live **zoomable & pannable** pixel grid
- Toggle between **square** and **circular** pixels
- Adjustable grid lines
- High-quality **printable version** with legend
- Export grid as PNG + color data as CSV
- Dark mode + Save/Load preferences
- Fully offline — works in any modern browser

## Motivation

This project is v2 of a web app I create about 7 years ago called, [canvas-pixel-color-counter](https://github.com/townsean/canvas-pixel-color-counter). I've always wanted to revisit the project to include some additional features:

* A way to export the color counts in a printable format
* A way to scale uploaded image so it's easier to see with grid lines so each pixel is easily distinguishable 

That has goal has been fullfilled with PixelGrid.

## Project Setup + How to Use

1. Download or clone this repository
2. Start local web server, ie `python -m http.server 8000`
3. Open `localhost:8000` in your browser
4. Upload an image
5. Adjust settings and explore the grid
6. Export or print your build map

## Built With

- JavaScript
- HTML5 Canvas
- Web Workers
- No 3rd party dependencies

## Maintainers

* [Ashley Grenon - @townsean](https://github.com/townsean)

## License (MIT)

The MIT License (MIT) Copyright (c) 2026 Ashley Grenon

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**Originally inspired by** [canvas-pixel-color-counter](https://github.com/townsean/canvas-pixel-color-counter)