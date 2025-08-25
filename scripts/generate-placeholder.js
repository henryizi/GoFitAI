const GIFEncoder = require('gif-encoder-2');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a simple loading animation
const width = 100;
const height = 100;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Create a new GIF encoder
const encoder = new GIFEncoder(width, height);
encoder.setDelay(100); // 100ms delay between frames
encoder.start();

// Generate 8 frames of a simple loading animation
for (let frame = 0; frame < 8; frame++) {
  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Draw loading circle
  ctx.beginPath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.arc(
    width / 2,
    height / 2,
    30,
    (frame / 8) * Math.PI * 2,
    ((frame + 6) / 8) * Math.PI * 2
  );
  ctx.stroke();

  // Add frame to GIF
  encoder.addFrame(ctx);
}

// Finish encoding
encoder.finish();

// Save the GIF
const gifBuffer = encoder.out.getData();
const outputPath = path.join(__dirname, '..', 'assets', 'videos', 'placeholder.gif');
fs.writeFileSync(outputPath, gifBuffer);
console.log(`Placeholder GIF created at: ${outputPath}`); 