const GIFEncoder = require('gif-encoder-2');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const width = 100;
const height = 100;

// Function to create exercise GIF
function createExerciseGif(exercise) {
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

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    switch(exercise) {
      case 'push_up':
        // Animated push-up stick figure
        const pushUpHeight = 60 + Math.sin(frame / 8 * Math.PI * 2) * 10;
        drawPushUp(ctx, pushUpHeight);
        break;
      
      case 'squat':
        // Animated squat stick figure
        const squatHeight = 30 + Math.sin(frame / 8 * Math.PI * 2) * 15;
        drawSquat(ctx, squatHeight);
        break;
    }

    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}

function drawPushUp(ctx, height) {
  const centerX = width / 2;
  ctx.beginPath();
  
  // Head
  ctx.arc(centerX - 20, height - 10, 5, 0, Math.PI * 2);
  
  // Body
  ctx.moveTo(centerX - 20, height - 5);
  ctx.lineTo(centerX + 20, height - 5);
  
  // Arms
  ctx.moveTo(centerX - 15, height);
  ctx.lineTo(centerX - 15, height - 15);
  ctx.moveTo(centerX + 15, height);
  ctx.lineTo(centerX + 15, height - 15);
  
  // Legs
  ctx.moveTo(centerX + 20, height - 5);
  ctx.lineTo(centerX + 40, height);
  
  ctx.stroke();
}

function drawSquat(ctx, height) {
  const centerX = width / 2;
  ctx.beginPath();
  
  // Head
  ctx.arc(centerX, height - 25, 8, 0, Math.PI * 2);
  
  // Body
  ctx.moveTo(centerX, height - 17);
  ctx.lineTo(centerX, height);
  
  // Arms
  ctx.moveTo(centerX - 15, height - 10);
  ctx.lineTo(centerX, height - 15);
  ctx.lineTo(centerX + 15, height - 10);
  
  // Legs
  ctx.moveTo(centerX, height);
  ctx.lineTo(centerX - 15, height + 20);
  ctx.moveTo(centerX, height);
  ctx.lineTo(centerX + 15, height + 20);
  
  ctx.stroke();
}

// Generate example exercise GIFs
const exercises = ['push_up', 'squat'];

exercises.forEach(exercise => {
  const gifBuffer = createExerciseGif(exercise);
  const outputPath = path.join(__dirname, '..', 'assets', 'videos', 'exercises', `${exercise}.gif`);
  fs.writeFileSync(outputPath, gifBuffer);
  console.log(`Created ${exercise} exercise GIF at: ${outputPath}`);
}); 