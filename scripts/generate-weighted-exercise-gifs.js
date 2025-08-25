const GIFEncoder = require('gif-encoder-2');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const width = 200;  // Increased size for better detail
const height = 200;

// Exercise animations configurations
const exercises = {
  // Barbell Exercises
  'bench_press': {
    frames: 8,
    draw: (ctx, frame, height) => {
      const y = height + Math.sin(frame / 8 * Math.PI * 2) * 20;
      drawBenchPress(ctx, y);
    }
  },
  'squat': {
    frames: 8,
    draw: (ctx, frame, height) => {
      const y = height + Math.sin(frame / 8 * Math.PI * 2) * 30;
      drawSquat(ctx, y);
    }
  },
  'deadlift': {
    frames: 8,
    draw: (ctx, frame, height) => {
      const y = height + Math.sin(frame / 8 * Math.PI * 2) * 40;
      drawDeadlift(ctx, y);
    }
  },
  // Dumbbell Exercises
  'dumbbell_press': {
    frames: 8,
    draw: (ctx, frame, height) => {
      const y = height + Math.sin(frame / 8 * Math.PI * 2) * 20;
      drawDumbbellPress(ctx, y);
    }
  },
  'lateral_raise': {
    frames: 8,
    draw: (ctx, frame, height) => {
      const angle = (frame / 8) * Math.PI;
      drawLateralRaise(ctx, angle);
    }
  }
};

// Drawing helper functions
function drawStickFigure(ctx, x, y, scale = 1) {
  // Head
  ctx.beginPath();
  ctx.arc(x, y - 40 * scale, 10 * scale, 0, Math.PI * 2);
  ctx.stroke();
  
  // Body
  ctx.beginPath();
  ctx.moveTo(x, y - 30 * scale);
  ctx.lineTo(x, y + 10 * scale);
  ctx.stroke();
  
  // Arms
  ctx.beginPath();
  ctx.moveTo(x - 20 * scale, y - 20 * scale);
  ctx.lineTo(x, y - 10 * scale);
  ctx.lineTo(x + 20 * scale, y - 20 * scale);
  ctx.stroke();
  
  // Legs
  ctx.beginPath();
  ctx.moveTo(x, y + 10 * scale);
  ctx.lineTo(x - 15 * scale, y + 40 * scale);
  ctx.moveTo(x, y + 10 * scale);
  ctx.lineTo(x + 15 * scale, y + 40 * scale);
  ctx.stroke();
}

function drawBarbell(ctx, x, y, width) {
  // Bar
  ctx.beginPath();
  ctx.moveTo(x - width/2, y);
  ctx.lineTo(x + width/2, y);
  ctx.stroke();
  
  // Weights
  ctx.beginPath();
  ctx.arc(x - width/2, y, 15, 0, Math.PI * 2);
  ctx.arc(x + width/2, y, 15, 0, Math.PI * 2);
  ctx.fill();
}

function drawDumbbells(ctx, x1, y1, x2, y2) {
  // Left dumbbell
  ctx.beginPath();
  ctx.arc(x1, y1, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Right dumbbell
  ctx.beginPath();
  ctx.arc(x2, y2, 8, 0, Math.PI * 2);
  ctx.fill();
}

// Exercise-specific drawing functions
function drawBenchPress(ctx, height) {
  const centerX = width/2;
  
  // Draw bench
  ctx.beginPath();
  ctx.rect(centerX - 30, height + 20, 60, 10);
  ctx.stroke();
  
  // Draw figure
  drawStickFigure(ctx, centerX, height);
  
  // Draw barbell
  drawBarbell(ctx, centerX, height - 20, 100);
}

function drawSquat(ctx, height) {
  const centerX = width/2;
  drawStickFigure(ctx, centerX, height, 1.2);
  drawBarbell(ctx, centerX, height - 30, 120);
}

function drawDeadlift(ctx, height) {
  const centerX = width/2;
  drawStickFigure(ctx, centerX, height, 1.2);
  drawBarbell(ctx, centerX, height + 20, 120);
}

function drawDumbbellPress(ctx, height) {
  const centerX = width/2;
  drawStickFigure(ctx, centerX, height);
  drawDumbbells(ctx, centerX - 25, height - 20, centerX + 25, height - 20);
}

function drawLateralRaise(ctx, angle) {
  const centerX = width/2;
  const centerY = height/2;
  
  drawStickFigure(ctx, centerX, centerY);
  
  // Draw dumbbells at angle
  const radius = 30;
  const x1 = centerX + Math.cos(angle) * radius;
  const y1 = centerY + Math.sin(angle) * radius;
  const x2 = centerX + Math.cos(angle + Math.PI) * radius;
  const y2 = centerY + Math.sin(angle + Math.PI) * radius;
  
  drawDumbbells(ctx, x1, y1, x2, y2);
}

// Generate GIFs for each exercise
async function generateExerciseGifs() {
  for (const [exerciseName, config] of Object.entries(exercises)) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const encoder = new GIFEncoder(width, height);
    
    encoder.setDelay(100);
    encoder.start();

    for (let frame = 0; frame < config.frames; frame++) {
      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // Set drawing styles
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#000000';
      ctx.lineWidth = 3;
      
      // Draw the exercise frame
      config.draw(ctx, frame, height/2);
      
      encoder.addFrame(ctx);
    }
    
    encoder.finish();
    
    // Save the GIF
    const gifBuffer = encoder.out.getData();
    const outputPath = path.join(__dirname, '..', 'assets', 'videos', 'exercises', `${exerciseName}.gif`);
    fs.writeFileSync(outputPath, gifBuffer);
    console.log(`Created ${exerciseName} GIF at: ${outputPath}`);
  }
}

// Run the generation
generateExerciseGifs(); 