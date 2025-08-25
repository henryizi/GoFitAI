const GIFEncoder = require('gif-encoder-2');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Categories and their colors
const categories = {
  'push': '#FF6B6B',
  'pull': '#4ECDC4',
  'legs': '#45B7D1',
  'core': '#96CEB4',
  'cardio': '#FFEEAD'
};

const width = 100;
const height = 100;

// Function to create category GIF
function createCategoryGif(category, color) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const encoder = new GIFEncoder(width, height);
  
  encoder.setDelay(100);
  encoder.start();

  // Generate 8 frames
  for (let frame = 0; frame < 8; frame++) {
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw category indicator
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    switch(category) {
      case 'push':
        // Animated arrows pointing outward
        const pushOffset = frame * 2;
        drawArrow(ctx, 30 - pushOffset, 50, 70 + pushOffset, 50);
        break;
      
      case 'pull':
        // Animated arrows pointing inward
        const pullOffset = frame * 2;
        drawArrow(ctx, 70 + pullOffset, 50, 30 - pullOffset, 50);
        break;
      
      case 'legs':
        // Animated squat representation
        const squatHeight = 30 + Math.sin(frame / 8 * Math.PI * 2) * 10;
        drawStickFigure(ctx, squatHeight);
        break;
      
      case 'core':
        // Rotating circle segment
        const rotation = (frame / 8) * Math.PI * 2;
        drawRotatingCore(ctx, rotation);
        break;
      
      case 'cardio':
        // Pulsing heart
        const scale = 1 + Math.sin(frame / 8 * Math.PI * 2) * 0.2;
        drawHeart(ctx, scale);
        break;
    }

    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}

// Helper drawing functions
function drawArrow(ctx, fromX, fromY, toX, toY) {
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  
  // Arrow head
  const headLen = 10;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawStickFigure(ctx, height) {
  const centerX = width / 2;
  ctx.beginPath();
  // Head
  ctx.arc(centerX, height - 20, 10, 0, Math.PI * 2);
  // Body
  ctx.moveTo(centerX, height - 10);
  ctx.lineTo(centerX, height + 20);
  // Legs
  ctx.lineTo(centerX - 15, height + 40);
  ctx.moveTo(centerX, height + 20);
  ctx.lineTo(centerX + 15, height + 40);
  ctx.stroke();
}

function drawRotatingCore(ctx, rotation) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rotation);
  
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI / 2);
  ctx.stroke();
  
  ctx.restore();
}

function drawHeart(ctx, scale) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);
  
  ctx.beginPath();
  ctx.moveTo(0, 15);
  ctx.bezierCurveTo(-25, -10, -25, -20, 0, -30);
  ctx.bezierCurveTo(25, -20, 25, -10, 0, 15);
  ctx.fill();
  
  ctx.restore();
}

// Generate GIFs for each category
Object.entries(categories).forEach(([category, color]) => {
  const gifBuffer = createCategoryGif(category, color);
  const outputPath = path.join(__dirname, '..', 'assets', 'videos', 'categories', `${category}_category.gif`);
  fs.writeFileSync(outputPath, gifBuffer);
  console.log(`Created ${category} category GIF at: ${outputPath}`);
}); 